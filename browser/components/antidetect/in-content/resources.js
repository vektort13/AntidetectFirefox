/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from preferences.js */

var gResourcesPane = {
	/**
	 * Initialization of this.
	 */
	init() {
		// Notify observers that the UI is now ready
		Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService)
			.notifyObservers(window, "resources-pane-loaded", null);
	},
};
