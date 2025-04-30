export const view = (state, { updateState, dispatch }) => {
	console.log("View function called with state:", state);
	const {
		properties = {},
		currentCardState,
		designerInitialized,
		designer,
		tableFields,
	} = state || {};
	
	// Return a basic wrapper that will be populated by the designer
	const wrapper = {
		tag: "div",
		props: {
			className: "designer-host",
			style: {
				width: "100%",
				height: "100%",
				margin: 0,
				padding: 0,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			},
		},
		children: [
			{
				tag: "div",
				props: {
					id: "designerRootHost",
					style: {
						flex: 1,
						position: "relative",
						margin: 0,
						padding: 0,
						overflow: "hidden",
					},
				},
			},
		],
	};

	return wrapper;
};
