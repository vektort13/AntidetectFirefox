/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from preferences.js */

var gWebRTCPane = {
	/**
	 * Initialization of this.
	 */
	init() {
		function setEventListener(aId, aEventType, aCallback) {
			document.getElementById(aId).addEventListener(
					aEventType, aCallback.bind(gWebRTCPane));
		}

		document.getElementById("addressEnable").checked =
			document.getElementById("antidetect.webrtc.ip.mode").value > 0 ? 1 : 0;
		this.onAddressChange(1);
		setEventListener("addressEnable", "CheckboxStateChange", function(){
			document.getElementById("antidetect.webrtc.ip.mode").value =
				document.getElementById("addressEnable").checked;
			gWebRTCPane.onAddressChange();
		});
		setEventListener("addressRandomEnable", "CheckboxStateChange", function(){
			gWebRTCPane.onAddressChange();
		});

		this.onDeviceChange(1);
		setEventListener("webrtcDeviceEnable", "CheckboxStateChange", this.onDeviceSet);
		setEventListener("webrtcDeviceRandomEnable", "CheckboxStateChange", this.onDeviceSet);

		// Notify observers that the UI is now ready
		Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService)
			.notifyObservers(window, "webrtc-pane-loaded", null);
	},

	saveLocalIP(){
		var ip = document.getElementById('localIP');
		if ('random' == ip.value || gWebRTCPane.isValidIP(ip.value)){
			if (ip.classList.contains('invalid'))
				ip.classList.remove('invalid');
			return undefined;
		}

		if (!ip.classList.contains('invalid'))
			ip.classList.add('invalid');
		return "127.0.0.1";
	},

	savePublicIP(){
		var ip = document.getElementById('publicIP');
		if ('random' == ip.value || 'auto' == ip.value || gWebRTCPane.isValidIP(ip.value)){
			if (ip.classList.contains('invalid'))
				ip.classList.remove('invalid');
			return undefined;
		}

		if (!ip.classList.contains('invalid'))
			ip.classList.add('invalid');
		return "8.8.8.8";
	},

	isValidIP(ip){
		 if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)){
			return (true);
		 }
		 return false;
	},

	onAddressChange(initial = 0){
		var address = document.getElementById("addressEnable");
		var addressRandom = document.getElementById("addressRandomEnable");
		var localIP = document.getElementById("localIP");
		var publicIP = document.getElementById("publicIP");

		if (!address.checked){
			addressRandom.disabled = 1;
			localIP.disabled = 1;
			publicIP.disabled = 1;
			return;
		}else{
			addressRandom.disabled = 0;
		}

		if (initial){
			if ("random" == localIP.value && "random" == publicIP.value){
				addressRandom.checked = 1;
				localIP.disabled = 1;
				publicIP.disabled = 1;
			}else{
				addressRandom.checked = 0;
				localIP.disabled = 0;
				publicIP.disabled = 0;
			}
		}else{
			if (addressRandom.checked){
				localIP.disabled = 1;
				publicIP.disabled = 1;
				document.getElementById("antidetect.webrtc.ip.local").value = "random";
				document.getElementById("antidetect.webrtc.ip.public").value = "random";
			}else{
				localIP.disabled = 0;
				publicIP.disabled = 0;
				document.getElementById("antidetect.webrtc.ip.local").value = "";
				document.getElementById("antidetect.webrtc.ip.public").value = "";
				localIP.focus();
			}
		}
	},

	onDeviceSet(){
		document.getElementById("antidetect.webrtc.device.mode").value =
			( document.getElementById("webrtcDeviceEnable").checked ?
			  ( document.getElementById("webrtcDeviceRandomEnable").checked ? 2 : 1 ) : 0 );
		gWebRTCPane.onDeviceChange();
	},

	onDeviceChange(initial = 0){
		var webrtcDevice = document.getElementById("webrtcDeviceEnable");
		var webrtcDeviceRandom = document.getElementById("webrtcDeviceRandomEnable");
		var kind = document.getElementById("kind");
		var label = document.getElementById("label");
		var deviceId = document.getElementById("deviceId");
		var groupId = document.getElementById("groupId");

		var mode = document.getElementById("antidetect.webrtc.device.mode");
		switch (mode.value){
			case 1:
				if (initial){
					webrtcDevice.checked = 1;
					webrtcDeviceRandom.checked = 0;
				}
				webrtcDeviceRandom.disabled = 0;
				kind.disabled = 0;
				label.disabled = 0;
				deviceId.disabled = 0;
				groupId.disabled = 0;
				break;
			case 2:
				if (initial){
					webrtcDevice.checked = 1;
					webrtcDeviceRandom.checked = 1;
				}
				webrtcDeviceRandom.disabled = 0;
				kind.disabled = 1;
				label.disabled = 1;
				deviceId.disabled = 1;
				groupId.disabled = 1;
				break;
			default:
				if (initial){
					webrtcDevice.checked = 0;
					webrtcDeviceRandom.checked = 0;
				}
				webrtcDeviceRandom.disabled = 1;
				kind.disabled = 1;
				label.disabled = 1;
				deviceId.disabled = 1;
				groupId.disabled = 1;
				break;
		}
	},

};

