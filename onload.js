window.onload = function () {
    if (!ACDesigner.SettingsManager.isLocalStorageAvailable) {
        console.log("Local storage is not available.");
    }

    let designer = new ACDesigner.CardDesigner(ACDesigner.defaultMicrosoftHosts);
    designer.assetPath = "https://adaptivecards.microsoft.com";

    designer.attachTo(document.getElementById("designerRootHost"));
    // initialize monaco editor if available from the CDN
    if (window.monaco) {
        designer.monacoModuleLoaded(window.monaco);
    }
};