import { HostContainer } from "../host-container";
import * as AC from "adaptivecards";

export class ServiceNowContainer extends HostContainer {
    protected hostCapabilities = {
        supportsDataBindingExpressions: true,
        supportsPropertyEditorFeedback: true
    };

    constructor() {
        super("ServiceNow");
    }

    renderTo(hostElement: HTMLElement) {
        hostElement.style.backgroundColor = this.getBackgroundColor();
        
        // Add field picker buttons to all text inputs
        setTimeout(() => {
            const textInputs = hostElement.querySelectorAll('input[type="text"], textarea');
            textInputs.forEach((input: Element) => {
                if (input.parentNode && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
                    const wrapper = document.createElement('div');
                    wrapper.style.position = 'relative';
                    input.parentNode.insertBefore(wrapper, input);
                    wrapper.appendChild(input);
                    
                    const button = document.createElement('button');
                    button.className = 'acd-field-picker-button';
                    button.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M6.5 0a6.5 6.5 0 0 1 5.25 10.33l3.89 3.89a.5.5 0 0 1-.7.7l-3.89-3.89A6.5 6.5 0 1 1 6.5 0zm0 1a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" fill="currentColor"/></svg>';
                    button.setAttribute('aria-label', 'Pick field');
                    button.onclick = (e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showFieldPicker(input as HTMLInputElement);
                    };
                    wrapper.appendChild(button);
                }
            });
        }, 100);
    }
    
    private showFieldPicker(input: HTMLElement) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'acd-field-picker-overlay';
        document.body.appendChild(overlay);
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'acd-field-picker-modal';
        document.body.appendChild(modal);
        
        // Load fields
        const fields = this.getFields();
        fields.forEach(field => {
            const item = document.createElement('div');
            item.className = 'acd-field-item';
            item.textContent = `${field.label} (${field.name})`;
            item.onclick = () => {
                const reference = field.isReference ? 
                    `\${current.${field.name}.display_value}` : 
                    `\${current.${field.name}}`;
                
                if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                    const start = input.selectionStart ?? 0;
                    const end = input.selectionEnd ?? start;
                    input.value = input.value.substring(0, start) + reference + input.value.substring(end);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                overlay.remove();
                modal.remove();
            };
            modal.appendChild(item);
        });
        
        // Close on overlay click
        overlay.onclick = () => {
            overlay.remove();
            modal.remove();
        };
    }
    
    private getFields(): Array<{ name: string; label: string; isReference: boolean; }> {
        // This will be populated by the parent component
        return (window as any).tableFields || [];
    }

    getCurrentStyleSheet(): string {
        // Return ServiceNow specific styles
        return `
            .ac-container {
                padding: 8px;
                font-family: 'Source Sans Pro', sans-serif;
            }
        `;
    }

    getHostConfig(): AC.HostConfig {
        return new AC.HostConfig({
            spacing: {
                small: 8,
                default: 12,
                medium: 16,
                large: 20,
                extraLarge: 24,
                padding: 12
            },
            separator: {
                lineThickness: 1,
                lineColor: "#E1E1E1"
            },
            fontTypes: {
                default: {
                    fontFamily: "'Source Sans Pro', 'Helvetica Neue', arial",
                    fontSizes: {
                        small: 12,
                        default: 14,
                        medium: 16,
                        large: 18,
                        extraLarge: 24
                    }
                }
            },
            containerStyles: {
                default: {
                    backgroundColor: "#FFFFFF",
                    foregroundColors: {
                        default: {
                            default: "#333333",
                            subtle: "#767676"
                        },
                        accent: {
                            default: "#0066B3",
                            subtle: "#0066B3"
                        },
                        attention: {
                            default: "#BD0006",
                            subtle: "#BD0006"
                        },
                        good: {
                            default: "#2E7D32",
                            subtle: "#2E7D32"
                        },
                        warning: {
                            default: "#FF9800",
                            subtle: "#FF9800"
                        }
                    }
                }
            },
            actions: {
                actionsOrientation: "vertical",
                actionAlignment: "stretch"
            }
        });
    }

    // Function to process ServiceNow-specific data bindings
    processDataBindings(json: any): void {
        if (typeof json !== "object") return;

        for (let key in json) {
            if (typeof json[key] === "string" && json[key].startsWith("${")) {
                // Handle ServiceNow field references
                // Example: ${current.number} for current record number
                const fieldRef = json[key].slice(2, -1); // Remove ${ and }
                json[key] = this.resolveFieldReference(fieldRef);
            } else if (typeof json[key] === "object") {
                this.processDataBindings(json[key]);
            }
        }
    }

    private resolveFieldReference(fieldRef: string): string {
        // TODO: Implement actual ServiceNow field resolution
        // This would need to interact with ServiceNow's g_form or GlideRecord
        return `[${fieldRef}]`; // Placeholder for now
    }
}
