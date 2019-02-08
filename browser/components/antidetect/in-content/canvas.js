/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from preferences.js */

var gCanvas2dPane = {
	/**
	 * Initialization of this.
	 */
	init() {
		function setEventListener(aId, aEventType, aCallback) {
			document.getElementById(aId).addEventListener(
					aEventType, aCallback.bind(gCanvas2dPane));
		}

		document.getElementById("canvasEnable").checked =
			document.getElementById("antidetect.canvas2d.mode").value > 0 ? 1 : 0;
		this.onCanvasChange(1);
		setEventListener("canvasEnable", "CheckboxStateChange", function(){
			document.getElementById("antidetect.canvas2d.mode").value =
				document.getElementById("canvasEnable").checked;
			gCanvas2dPane.onCanvasChange();
		});
		setEventListener("canvasRandomEnable", "CheckboxStateChange", function(){
			gCanvas2dPane.onCanvasChange();
		});

		// Notify observers that the UI is now ready
		Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService)
			.notifyObservers(window, "canvas-pane-loaded", null);
	},

	onCanvasChange(initial = 0){
		var canvas = document.getElementById("canvasEnable");
		var canvasRandom = document.getElementById("canvasRandomEnable");
		var randomSeed = document.getElementById("canvasRandomSeed");

		if (!canvas.checked){
			canvasRandom.disabled = 1;
			randomSeed.disabled = 1;
			return;
		}else{
			canvasRandom.disabled = 0;
		}

		if (initial){
			if (0 == randomSeed.value){
				canvasRandom.checked = 1;
				randomSeed.disabled = 1;
			}else{
				canvasRandom.checked = 0;
				randomSeed.disabled = 0;
			}
		}else{
			if (canvasRandom.checked){
				document.getElementById("antidetect.canvas2d.seed").value = 0;
				randomSeed.disabled = 1;
			}else{
				randomSeed.disabled = 0;
				randomSeed.focus();
			}
		}
	},
};

