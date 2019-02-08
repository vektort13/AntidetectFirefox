/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from preferences.js */

var gAudioContextPane = {
	/**
	 * Initialization of this.
	 */
	init() {
		function setEventListener(aId, aEventType, aCallback) {
			document.getElementById(aId).addEventListener(
					aEventType, aCallback.bind(gAudioContextPane));
		}

		document.getElementById("audiocontextEnable").checked =
			document.getElementById("antidetect.audiocontext").value;
		this.onAudioContextChange(1);
		setEventListener("audiocontextEnable", "CheckboxStateChange", function(){
			document.getElementById("antidetect.audiocontext").value =
				document.getElementById("audiocontextEnable").checked;
			gAudioContextPane.onAudioContextChange();
		});
		setEventListener("audiocontextRandomEnable", "CheckboxStateChange", function(){
			gAudioContextPane.onAudioContextChange();
		});

		// Notify observers that the UI is now ready
		Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService)
			.notifyObservers(window, "audiocontext-pane-loaded", null);
	},

	onAudioContextChange(initial = 0){
		var audiocontext = document.getElementById("audiocontextEnable");
		var audiocontextRandom = document.getElementById("audiocontextRandomEnable");
		var randomSeed = document.getElementById("audiocontextRandomSeed");

		if (!audiocontext.checked){
			audiocontextRandom.disabled = 1;
			randomSeed.disabled = 1;
			return;
		}else{
			audiocontextRandom.disabled = 0;
		}

		if (initial){
			if (0 == randomSeed.value){
				audiocontextRandom.checked = 1;
				randomSeed.disabled = 1;
			}else{
				audiocontextRandom.checked = 0;
				randomSeed.disabled = 0;
			}
		}else{
			if (audiocontextRandom.checked){
				document.getElementById("antidetect.audiocontext.seed").value = 0;
				randomSeed.disabled = 1;
			}else{
				randomSeed.disabled = 0;
				randomSeed.focus();
			}
		}
	},
};

