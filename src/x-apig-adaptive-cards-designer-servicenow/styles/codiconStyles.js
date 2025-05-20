import codiconTtf from "./codicon.ttf";

export const codiconFontFace = `
@font-face {
    font-family: "codicon";
    font-display: block;
    src: url("${codiconTtf}") format("truetype");
}`;

export const codiconStyles = `
.codicon[class*='codicon-'] {
    font: normal normal normal 16px/1 codicon;
    display: inline-block;
    text-decoration: none;
    text-rendering: auto;
    text-align: center;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
}
/* icon rules are dynamically created in codiconStyles */
`;

export const codiconModifierStyles = `
.codicon-wrench-subaction {
    opacity: 0.5;
}

@keyframes codicon-spin {
    100% {
        transform:rotate(360deg);
    }
}

.codicon-sync.codicon-modifier-spin,
.codicon-loading.codicon-modifier-spin,
.codicon-gear.codicon-modifier-spin,
.codicon-notebook-state-executing.codicon-modifier-spin {
    /* Use steps to throttle FPS to reduce CPU usage */
    animation: codicon-spin 1.5s steps(30) infinite;
}

.codicon-modifier-disabled {
    opacity: 0.4;
}

/* custom speed & easing for loading icon */
.codicon-loading,
.codicon-tree-item-loading::before {
    animation-duration: 1s !important;
    animation-timing-function: cubic-bezier(0.53, 0.21, 0.29, 0.67) !important;
}
`;