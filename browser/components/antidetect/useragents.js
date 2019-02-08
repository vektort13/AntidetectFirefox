/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from ../../../toolkit/content/treeUtils.js */

"use strict";

var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource:///modules/AntiDetect_consts.jsm");

var gUserAgentsWindow = {
	_tree: null,
	_useragents: [],
	_consts: null,

	_view: {
		_rowCount: 0,
		get rowCount() {
			return this._rowCount;
		},
		getCellText(aRow, aColumn) {
			if (aColumn.id == "useragentCol")
				return gUserAgentsWindow._useragents[aRow];
			return "ERROR/"+aRow+":"+aColumn.id;
		},

		isSeparator(aIndex) { return false; },
		isSorted() { return false; },
		isContainer(aIndex) { return false; },
		setTree(aTree) {},
		getImageSrc(aRow, aColumn) {},
		getProgressMode(aRow, aColumn) {},
		getCellValue(aRow, aColumn) {},
		cycleHeader(column) {},
		getRowProperties(row) { return ""; },
		getColumnProperties(column) { return ""; },
		getCellProperties(row, column) { return ""; },
	},

	onWindowKeyPress(aEvent) {
		if (aEvent.keyCode == KeyEvent.DOM_VK_ESCAPE)
			window.close();
	},

	onLoad() {
		var params = (window.arguments && window.arguments[0]) ?
			window.arguments[0] : null;
		this.init(params);
	},

	init(aParams) {
		this._consts = new AntiDetect_consts();

		this._tree = document.getElementById("useragentsTree");
		this._useragents = this._consts.userAgents;
		this._view._rowCount = this._useragents.length;
		this._tree.view = this._view;

		document.documentElement.instantApply = true;
	},

	uninit() {
		this._consts = null;
	},

	onUserAgentSelected() {
		var hasSelection = this._tree.view.selection.count > 0;
		var hasRows = this._tree.view.rowCount > 0;

		if (hasSelection && hasRows){
			var elem = this._tree.view.selection.currentIndex;
			document.getElementById('antidetect.useragent.string').value =
				this._useragents[elem];
		}
	},
};
