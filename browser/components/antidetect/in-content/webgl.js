/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from preferences.js */

XPCOMUtils.defineLazyModuleGetter(this, "AntiDetect_consts",
		"resource:///modules/AntiDetect_consts.jsm");

var gWebGLPane = {
	/**
	 * Initialization of this.
	 */

	init() {
		function setEventListener(aId, aEventType, aCallback) {
			document.getElementById(aId).addEventListener(
					aEventType, aCallback.bind(gWebGLPane));
		}

		setEventListener("showRendererTemplatesButton", "command", function() {
			gSubDialog.open("chrome://browser/content/antidetect/renderers.xul");
		});

		this.onModeChange(1);
		setEventListener("reportHashEnable", "CheckboxStateChange", this.onModeSet);
		setEventListener("reportHashRandomEnable", "CheckboxStateChange", this.onModeSet);

		this.onImageHashChange(1);
		setEventListener("imagehashEnable", "CheckboxStateChange", function(){
			gWebGLPane.onImageHashChange();
		});
		setEventListener("imagehashRandomEnable", "CheckboxStateChange", function(){
			gWebGLPane.onImageHashChange();
		});

		// Notify observers that the UI is now ready
		Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService)
			.notifyObservers(window, "webgl-pane-loaded", null);
	},

	onImageHashChange(initial = 0){
		var imagehash = document.getElementById("imagehashEnable");
		var imagehashRandom = document.getElementById("imagehashRandomEnable");
		var randomSeed = document.getElementById("imagehashRandomSeed");

		if (!imagehash.checked){
			imagehashRandom.disabled = 1;
			randomSeed.disabled = 1;
			return;
		}else{
			imagehashRandom.disabled = 0;
		}

		if (initial){
			if (0 == randomSeed.value){
				imagehashRandom.checked = 1;
				randomSeed.disabled = 1;
			}else{
				imagehashRandom.checked = 0;
				randomSeed.disabled = 0;
			}
		}else{
			if (imagehashRandom.checked){
				document.getElementById("antidetect.webgl.imagehash.seed").value = 0;
				randomSeed.disabled = 1;
			}else{
				randomSeed.disabled = 0;
				randomSeed.focus();
			}
		}
	},

	onModeSet(){
		document.getElementById("antidetect.webgl.mode").value =
			( document.getElementById("reportHashEnable").checked ?
			  ( document.getElementById("reportHashRandomEnable").checked ? 2 : 3 ) : 0 );
		gWebGLPane.onModeChange();
	},

	onModeChange(initial = 0){
		var reportHash = document.getElementById("reportHashEnable");
		var reportHashRandom = document.getElementById("reportHashRandomEnable");
		var vendorString = document.getElementById("vendorString");
		var rendererString = document.getElementById("rendererString");
		var showRendererTemplates = document.getElementById("showRendererTemplatesButton");

		var mode = document.getElementById("antidetect.webgl.mode");
		switch (mode.value){
			case 3:
				if (initial){
					reportHash.checked = 1;
					reportHashRandom.checked = 0;
				}
				reportHashRandom.disabled = 0;
				vendorString.disabled = 0;
				rendererString.disabled = 0;
				showRendererTemplates.disabled = 0;
				break;
			case 2:
			case 1:
				if (initial){
					reportHash.checked = 1;
					reportHashRandom.checked = 1;
				}
				reportHashRandom.disabled = 0;
				vendorString.disabled = 1;
				rendererString.disabled = 1;
				showRendererTemplates.disabled = 1;
				break;
			default:
				if (initial){
					reportHash.checked = 0;
					reportHashRandom.checked = 0;
				}
				reportHashRandom.disabled = 1;
				vendorString.disabled = 1;
				rendererString.disabled = 1;
				showRendererTemplates.disabled = 1;
				break;
		}
	},
};

