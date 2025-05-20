window.onload = function () {
    if (!ACDesigner.SettingsManager.isLocalStorageAvailable) {
        console.log("Local storage is not available.");
    }

    let designer = new ACDesigner.CardDesigner(ACDesigner.defaultMicrosoftHosts);
    designer.assetPath = "https://adaptivecards.microsoft.com";

    designer.attachTo(document.getElementById("designerRootHost"));
    // notify designer when Monaco is ready
    if (window.require) {
        require(['vs/editor/editor.main'], function () {
            designer.monacoModuleLoaded();
        });
    } else if (window.monaco) {
        designer.monacoModuleLoaded();
    }
};