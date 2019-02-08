/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Based on ResourceFilter: A direct workaround for https://bugzil.la/863246
 * https://notabug.org/desktopd/no-resource-uri-leak/src/master/src/resource-filter/content-policy.js
 */

const Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

// Import XPCOMUtils object.
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");

function ContentPolicy() {
	this.uriFingerprinting = null;

	// Register as an nsIContentPolicy filter.
	let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
	registrar.registerFactory(this.classID, this.classDescription,
			this.contractID, this);

	let catMan = Cc["@mozilla.org/categorymanager;1"]
		.getService(Ci.nsICategoryManager);
	catMan.addCategoryEntry("content-policy", this.contractID, this.contractID,
			false, true);
}

ContentPolicy.prototype = {
	classDescription: "ContentPolicy",
	classID: Components.ID("{5acb42e7-6676-4cf1-875e-adb38365ec9e}"),
	contractID: "@vektort13.pro/content-policy;1",

	uriWhitelist: {
		// Video playback.
		"chrome://global/content/TopLevelVideoDocument.js": Ci.nsIContentPolicy.TYPE_SCRIPT,
		"resource://gre/res/TopLevelVideoDocument.css": Ci.nsIContentPolicy.TYPE_STYLESHEET,
		"chrome://global/content/bindings/videocontrols.xml": Ci.nsIContentPolicy.TYPE_XBL,
		"chrome://global/content/bindings/scale.xml": Ci.nsIContentPolicy.TYPE_XBL,
		"chrome://global/content/bindings/progressmeter.xml": Ci.nsIContentPolicy.TYPE_XBL,
		"chrome://global/content/bindings/button.xml": Ci.nsIContentPolicy.TYPE_XBL,
		"chrome://global/content/bindings/general.xml": Ci.nsIContentPolicy.TYPE_XBL,
		"chrome://global/content/bindings/text.xml": Ci.nsIContentPolicy.TYPE_XBL,

		// Image display.
		"resource://gre/res/ImageDocument.css": Ci.nsIContentPolicy.TYPE_STYLESHEET,
		"resource://gre/res/TopLevelImageDocument.css": Ci.nsIContentPolicy.TYPE_STYLESHEET,

		// Scrollbars, text box resizer, and content keyboard shortcuts.
		"chrome://global/content/bindings/scrollbar.xml": Ci.nsIContentPolicy.TYPE_XBL,
		"chrome://global/content/bindings/resizer.xml": Ci.nsIContentPolicy.TYPE_XBL,
		"chrome://global/content/platformHTMLBindings.xml": Ci.nsIContentPolicy.TYPE_XBL,

		// Directory listing.
		"chrome://global/skin/dirListing/dirListing.css": Ci.nsIContentPolicy.TYPE_STYLESHEET,
	},

	uriRegexWhitelist: [
		// Video playback: whitelist png and svg images under chrome://global/skin/media
	{ regex: /^chrome:\/\/global\/skin\/media\/.+\.(png|svg)$/,
		type: Ci.nsIContentPolicy.TYPE_IMAGE },

	// Video playback and image display: whitelist css files under chrome://global/skin/media
	{ regex: /^chrome:\/\/global\/skin\/media\/.+\.css$/,
		type: Ci.nsIContentPolicy.TYPE_STYLESHEET },
	],

	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIFactory,
			Ci.nsISupportsWeakReference]),

	// nsIFactory
	createInstance: function(outer, iid)
	{
		if (outer)
			throw Cr.NS_ERROR_NO_AGGREGATION;
		return this.QueryInterface(iid);
	},

	// nsIContentPolicy
	shouldLoad: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
		let browser = Preferences.get("antidetect.useragent.browser","Chrome");
		let enabled = Preferences.get("antidetect.useragent.uriProtect",true);
		if ("Firefox" == browser || !enabled)
			return Ci.nsIContentPolicy.ACCEPT;

		// Accept if the user does not care, no content URI is available or scheme
		// is not resource/chrome.
		if (this.uriFingerprinting || !aContentLocation ||
				!(aContentLocation.schemeIs('resource') ||
					aContentLocation.schemeIs('chrome'))) {
			return Ci.nsIContentPolicy.ACCEPT;
		}

		// Accept if no origin URI or if origin scheme is
		// chrome/resource/about/view-source.
		if (!aRequestOrigin || aRequestOrigin.schemeIs('resource') ||
				aRequestOrigin.schemeIs('chrome') ||
				aRequestOrigin.schemeIs('about') ||
				aRequestOrigin.schemeIs('view-source'))
			return Ci.nsIContentPolicy.ACCEPT;

		// Accept if resource directly loaded into a tab.
		if (Ci.nsIContentPolicy.TYPE_DOCUMENT === aContentType)
			return Ci.nsIContentPolicy.ACCEPT;

		// There's certain things that break horribly if they aren't allowed to
		// access URIs with proscribed schemes, with `aContentOrigin` basically
		// set to arbibrary URIs.
		//
		// XXX: Feature gate this behind the security slider or something, I don't
		// give a fuck.
		if (aContentLocation.spec in this.uriWhitelist)
			if (this.uriWhitelist[aContentLocation.spec] == aContentType)
				return Ci.nsIContentPolicy.ACCEPT;

		for (let wlObj of this.uriRegexWhitelist) {
			if ((wlObj.type == aContentType) && wlObj.regex.test(aContentLocation.spec))
				return Ci.nsIContentPolicy.ACCEPT;
		}

		return Ci.nsIContentPolicy.REJECT_REQUEST;
	},

	shouldProcess: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra)  {
		return Ci.nsIContentPolicy.ACCEPT;
	},
};

// Install a HTTP response handler to check for redirects to URLs with schemes
// that should be internal to the browser.  There's various safeguards and
// checks that cause the body to be unavailable, but the `onLoad()` behavior
// is inconsistent, which results in leaking information about the specific
// user agent instance (eg: what addons are installed).
var requestObserver = {
	ioService: Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
	observerService: Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),

	start: function() {
		this.observerService.addObserver(this, "http-on-examine-response", false);
	},

	observe: function(aSubject, aTopic, aData) {
		let aChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
		let aStatus = aChannel.responseStatus;

		// If this is a redirect...
		//
		// Note: `304 Not Modifed` isn't a redirect, so there is no Location header to check
		// in that case.
		if (aStatus >= 300 && aStatus < 400 && aStatus != 304) {
			try {
				let location = aChannel.getResponseHeader("Location");
				let aUri = this.ioService.newURI(location, null, null);

				let browser = Preferences.get("antidetect.useragent.browser","Chrome");
				let enabled = Preferences.get("antidetect.useragent.uriProtect",true);
				if ("Firefox" == browser || !enabled)
					return;

				// And it's redirecting into the browser or addon's internal URLs...
				if (aUri.schemeIs("resource") || aUri.schemeIs("chrome") || aUri.schemeIs("about")) {
					// Cancel the request.
					aSubject.cancel(Components.results.NS_BINDING_ABORTED);
				}
			} catch (ex) {}
		}
	},
};

// Create a content policy object; initialization is done in the contructor.
var cp = new ContentPolicy();

// In the chrome process, register the request observer to handle redirects.
if (Services.appinfo.processType == Services.appinfo.PROCESS_TYPE_DEFAULT) {
	requestObserver.start();
}
