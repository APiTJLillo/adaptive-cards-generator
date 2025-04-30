export const createGlobalDocumentProxy = (shadowRoot) => {
	const originalGetElementById = document.getElementById.bind(document);
	const originalQuerySelector = document.querySelector.bind(document);
	const originalQuerySelectorAll = document.querySelectorAll.bind(document);
	const originalGetElementByClassName =
		document.getElementsByClassName.bind(document);
	const originalBodyAppendChild = document.body.appendChild.bind(document.body);
	const originalBodyRemoveChild = document.body.removeChild.bind(document.body);
	const originalCreateElement = document.createElement.bind(document);

	// Enhance getElementById to better handle Monaco elements
	document.getElementById = function (id) {
		// Check for Monaco-specific elements first
		if (id && (id.startsWith("monaco-") || id.includes("editor"))) {
			let element = shadowRoot.getElementById(id);
			if (!element) {
				element = originalGetElementById(id);
				if (element) {
					try {
						shadowRoot.appendChild(element);
					} catch (e) {
						console.warn("Could not move element to shadow root:", e);
					}
				}
			}
			return element;
		}
		return shadowRoot.getElementById(id) || originalGetElementById(id);
	};

	document.querySelector = function (selector) {
		return (
			shadowRoot.querySelector(selector) || originalQuerySelector(selector)
		);
	};

	document.querySelectorAll = function (selector) {
		const shadowResults = shadowRoot.querySelectorAll(selector);
		if (shadowResults.length > 0) return shadowResults;
		return originalQuerySelectorAll(selector);
	};

	document.getElementsByClassName = function (className) {
		return (
			shadowRoot.getElementsByClassName(className) ||
			originalGetElementByClassName(className)
		);
	};

	// Enhanced appendChild handling for Monaco
	document.head.appendChild = function (child) {
		if (child.tagName === "STYLE" || child.tagName === "LINK") {
			const clone = child.cloneNode(true);
			shadowRoot.appendChild(clone);
		}
		return child;
	};

	document.body.appendChild = function (child) {
		if (child.tagName === "IFRAME" && child.getAttribute("data-monaco-frame")) {
			return shadowRoot.appendChild(child);
		}
		if (child.style) {
			for (let prop in child.style) {
				if (
					child.style[prop] &&
					child.style[prop].includes &&
					child.style[prop].includes("50000px")
				) {
					return originalBodyAppendChild(child);
				}
			}
		}
		return shadowRoot.appendChild(child);
	};

	document.body.removeChild = function (child) {
		if (shadowRoot.contains(child)) {
			return shadowRoot.removeChild(child);
		}
		return originalBodyRemoveChild(child);
	};
};
