/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from ../../../toolkit/content/treeUtils.js */

"use strict";

var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource:///modules/AntiDetect_consts.jsm");

function Renderer(vendor,renderer) {
	this.vendor = vendor;
	this.renderer = renderer;
}

var gRenderersWindow = {
	_tree: null,
	_renderers: [],
	_consts: null,

	_view: {
		_rowCount: 0,
		get rowCount() {
			return this._rowCount;
		},
		getCellText(aRow, aColumn) {
			if (aColumn.id == "vendorCol")
				return gRenderersWindow._renderers[aRow].vendor;
			else if (aColumn.id == "rendererCol")
				return gRenderersWindow._renderers[aRow].renderer;
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
		this._loadRenderers();
		document.documentElement.instantApply = true;
	},

	uninit() {
		this._consts = null;
	},

	onRendererSelected() {
		var hasSelection = this._tree.view.selection.count > 0;
		var hasRows = this._tree.view.rowCount > 0;

		if (hasSelection && hasRows){
			var elem = this._tree.view.selection.currentIndex;
			document.getElementById('antidetect.webgl.override.vendor').value =
				this._renderers[elem].vendor;
			document.getElementById('antidetect.webgl.override.renderer').value =
				this._renderers[elem].renderer;
		}
	},

	_loadRenderers() {
		this._tree = document.getElementById("renderersTree");
		this._renderers = [];

		Object.keys(this._consts.renderers).forEach(function(vendor){
			Object.values(gRenderersWindow._consts.renderers[vendor]).forEach(function(renderer){
				gRenderersWindow._renderers.push( new Renderer(vendor,renderer) );
			});
		});

		this._view._rowCount = this._renderers.length;
		this._tree.view = this._view;
	},
};
