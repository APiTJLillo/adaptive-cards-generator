const ACDesigner = window.ACDesigner;

export class ServiceNowCardDesigner extends ACDesigner.CardDesigner {
	constructor(hostContainers) {
		super(hostContainers);
		this._toolboxInitialized = false;
	}

	initializeToolbox(toolboxContent, toolboxHeader) {
		this._toolboxInitialized = true;
		this._toolbox = {
			content: toolboxContent,
			header: toolboxHeader,
			isVisible: true,
			getHeaderBoundingRect: function () {
				if (!this.header) return null;
				const rect = this.header.getBoundingClientRect();
				return {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height,
					right: rect.right,
					bottom: rect.bottom,
				};
			},
		};
	}

	get toolbox() {
		return this._toolbox;
	}

	updateToolboxLayout() {
		if (!this._toolboxInitialized) return;
		super.updateToolboxLayout();
	}

	updateJsonEditorsLayout() {
		if (!this._toolboxInitialized) return;
		super.updateJsonEditorsLayout();
	}
}
