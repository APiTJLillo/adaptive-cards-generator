window.onload = function () {
    if (!ACDesigner.SettingsManager.isLocalStorageAvailable) {
        console.log("Local storage is not available.");
    }

    let designer = new ACDesigner.CardDesigner(ACDesigner.defaultMicrosoftHosts);
    designer.assetPath = "https://adaptivecards.microsoft.com";

    designer.attachTo(document.getElementById("designerRootHost"));

    // initialize monaco editor if a loader is available
    if (window.require && window.require.config) {
        window.require(['vs/editor/editor.main'], function () {
            designer.monacoModuleLoaded(window.monaco);
        });
    } else if (window.monaco) {
        designer.monacoModuleLoaded(window.monaco);
    } else {
        require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.17.1/min/vs' } });
        require(['vs/editor/editor.main'], function () {
            designer.monacoModuleLoaded();
        });
    }
};
