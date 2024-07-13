window.onload = function () {
    if (!ACDesigner.SettingsManager.isLocalStorageAvailable) {
        console.log("Local storage is not available.");
    }

    let designer = new ACDesigner.CardDesigner(ACDesigner.defaultMicrosoftHosts);
    designer.assetPath = "https://unpkg.com/adaptivecards-designer@latest/dist";

    designer.attachTo(document.getElementById("designerRootHost"));
    // initialize monaco editor and tell the Designer when it's been loaded
    require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.17.1/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        designer.monacoModuleLoaded();
    });
};