import { Button } from 'primereact/button/button.esm.js';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Tooltip } from 'react-tooltip';
import Chart from "./Chart.js"
import useProvenance from './hooks/useProvenance.js';
import useWidgetColors from './hooks/useWidgetColors.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

// Helper function to convert hex color to rgba with alpha
const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const AggregateView = ({ target }) => {
    const [open, setOpen] = useState()
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const [widgetColors, setWidgetColors] = useWidgetColors()
    const buttonRef = useRef(null);
    const [coloredBoxes, setColoredBoxes] = useState([])
    const intervalRef = useRef(null);
    const lastWidgetCountRef = useRef(0);
    const highlightedElementRef = useRef(null);

    // Use D3 chromatic scale for dynamic color allocation (memoized to prevent re-renders)
    const colorScale = useMemo(() => scaleOrdinal(schemeCategory10), [])

    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const updateColoredBoxes = () => {
            if (registeredComponents.size !== 0) {
                const sp = registeredComponents.get(target);
                if (sp && sp.registeredWidgets) {
                    const widgetSize = sp.registeredWidgets.size;
                    if (widgetSize !== 0) {
                        const boxes = [];
                        const widgetIds = Array.from(sp.registeredWidgets.keys());
                        const interactionCounts = [];

                        // First pass: collect all interaction counts to find max
                        for (const widgetId of widgetIds) {
                            const interactionCount = sp.detailedData?.get(widgetId)?.length ?? 0;
                            interactionCounts.push(interactionCount);
                        }

                        const maxInteractions = Math.max(...interactionCounts, 1); // At least 1 to avoid division by zero
                        const defaultWidth = 20; // Default fixed width for non-interacted widgets
                        const containerMaxWidth = 400; // Maximum width for the AggregateView container

                        // Create a map to assign consistent colors to each widgetId
                        const widgetIdToIndex = new Map();
                        widgetIds.forEach((id, idx) => widgetIdToIndex.set(id, idx));

                        // Calculate total fixed width required for non-interacted widgets
                        const nonInteractedCount = interactionCounts.filter(count => count === 0).length;
                        const totalFixedWidth = nonInteractedCount * defaultWidth;

                        // Calculate remaining width available for interacted widgets
                        const interactedCount = interactionCounts.length - nonInteractedCount;
                        const availableWidthForInteracted = Math.max(0, containerMaxWidth - totalFixedWidth);

                        // Calculate total interactions among interacted widgets for proportional sizing
                        const totalInteractions = interactionCounts.reduce((sum, count) => sum + count, 0);

                        // Second pass: create boxes with calculated widths
                        const colorMap = {}; // Track colors for each widgetId
                        for (let i = 0; i < widgetIds.length; i++) {
                            const widgetId = widgetIds[i];
                            // Get color from D3 scale using consistent index based on widgetId
                            const colorIndex = widgetIdToIndex.get(widgetId);
                            const baseColor = colorScale(colorIndex);
                            // Store color for this widgetId
                            colorMap[widgetId] = baseColor;
                            // Get interaction count from detailedData array length
                            const interactionCount = interactionCounts[i];

                            // Calculate width logic:
                            // 1. If NO interaction (count = 0): use default fixed width (20px)
                            // 2. If HAS interaction (count > 0): share remaining space proportionally
                            //    If it's the only interacted widget, it takes all available space.
                            //    If multiple widgets are interacted, they split space based on interaction count.
                            let calculatedWidth;
                            if (interactionCount === 0) {
                                calculatedWidth = defaultWidth;
                            } else {
                                if (totalInteractions > 0) {
                                    // Proportional share of available width
                                    const ratio = interactionCount / totalInteractions;
                                    calculatedWidth = ratio * availableWidthForInteracted;
                                } else {
                                    // Should not happen if interactionCount > 0, but safe fallback
                                    calculatedWidth = availableWidthForInteracted / interactedCount;
                                }
                            }

                            // Get the most recent interaction time
                            const interactions = sp.detailedData?.get(widgetId) ?? [];
                            let lastInteractionTime = null;
                            if (interactions.length > 0) {
                                // Find the entry with the highest index (most recent)
                                const mostRecent = interactions.reduce((latest, current) => {
                                    return (current.index > latest.index) ? current : latest;
                                }, interactions[0]);
                                lastInteractionTime = mostRecent.time;
                            }

                            boxes.push({ color: baseColor, widgetId, interactionCount, width: calculatedWidth, lastInteractionTime });
                        }

                        // No need for separate scaling pass as we calculated based on containerMaxWidth directly

                        // Update widgetColors state with the color mapping
                        setWidgetColors(prev => ({ ...prev, ...colorMap }));

                        // Sort boxes by last interaction time (oldest first, most recent last)
                        // Widgets with no interactions go to the left (beginning)
                        boxes.sort((a, b) => {
                            if (!a.lastInteractionTime && !b.lastInteractionTime) return 0;
                            if (!a.lastInteractionTime) return -1; // a goes to left
                            if (!b.lastInteractionTime) return 1; // b goes to left
                            // Both have interaction times, sort by oldest first (most recent goes rightmost)
                            return a.lastInteractionTime.getTime() - b.lastInteractionTime.getTime();
                        });

                        // Always update to reflect interaction count changes
                        setColoredBoxes(boxes);
                        if (widgetSize !== lastWidgetCountRef.current) {
                            lastWidgetCountRef.current = widgetSize;
                        }
                        return true; // Widgets found
                    }
                }
            }
            if (lastWidgetCountRef.current !== 0) {
                lastWidgetCountRef.current = 0;
                setColoredBoxes([]);
            }
            return false; // No widgets yet
        };

        // Update immediately
        const hasWidgets = updateColoredBoxes();

        // Set up interval to check for widget registration and interaction changes
        // Keep polling to update interaction counts even after widgets are found
        intervalRef.current = setInterval(() => {
            updateColoredBoxes();
        }, 200);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            // Clean up any active highlights
            if (highlightedElementRef.current) {
                highlightedElementRef.current.style.outline = '';
                highlightedElementRef.current.style.outlineOffset = '';
                highlightedElementRef.current = null;
            }
        };
    }, [registeredComponents, target, colorScale]);

    const handleBoxClick = (widgetId) => {
        // Remove previous highlight if any
        if (highlightedElementRef.current) {
            highlightedElementRef.current.style.outline = '';
            highlightedElementRef.current.style.outlineOffset = '';
            highlightedElementRef.current = null;
        }

        // Try multiple strategies to find the element
        let element = null;
        
        // Prefer container first to allow highlighting entire widget blocks
        const containerClass = `.${widgetId}`;
        const container = document.querySelector(containerClass);
        if (container) {
            if (
                widgetId.includes('checkbox') || container.classList.contains('checkbox-group') ||
                widgetId.includes('radiobutton') || container.classList.contains('radiobutton-group') ||
                widgetId.includes('slider') || widgetId.includes('input') ||
                widgetId.includes('dropdown')
            ) {
                element = container;
            } else {
                const input = container.querySelector('input');
                const slider = container.querySelector('[role="slider"], .p-slider, [class*="slider"]');
                const interactiveElement = container.querySelector('input, button, [role="slider"], [tabindex]');
                element = input || slider || interactiveElement || container;
            }
        }
        
        // Direct id lookup if container not found
        if (!element) {
            element = document.getElementById(widgetId);
        }
        
        // Special handling for checkbox-group and radio button group: find by class name variations
        if (!element && (widgetId.includes('checkbox') || widgetId.includes('Checkbox'))) {
            // Try to find checkbox-group container
            const checkboxGroupContainer = document.querySelector('.checkbox-group');
            if (checkboxGroupContainer) {
                element = checkboxGroupContainer;
            }
        }
        
        if (!element && (widgetId.includes('radiobutton') || widgetId.includes('Radiobutton'))) {
            // Try to find radiobutton-group container
            const radioGroupContainer = document.querySelector('.radiobutton-group');
            if (radioGroupContainer) {
                element = radioGroupContainer;
            }
        }
        
        // Search for elements with the id attribute anywhere
        if (!element) {
            element = document.querySelector(`[id="${widgetId}"]`);
        }
        
        // Find by data attributes
        if (!element) {
            element = document.querySelector(`[data-widget-id="${widgetId}"]`);
        }
        
        // Search all inputs and match by closest container class
        if (!element) {
            const allInputs = document.querySelectorAll('input, [role="slider"]');
            for (const input of allInputs) {
                // Check if input is within a container with class matching widget-id
                let parent = input.parentElement;
                let depth = 0;
                while (parent && depth < 5) {
                    if (parent.className && typeof parent.className === 'string' && parent.className.includes(widgetId)) {
                        element = input;
                        break;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
                if (element) break;
            }
        }

        if (element) {
            // Highlight the element
            element.style.outline = '3px solid #007bff';
            element.style.outlineOffset = '2px';
            element.style.transition = 'outline 0.2s ease';
            highlightedElementRef.current = element;

            // Scroll into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Remove highlight after 3 seconds
            setTimeout(() => {
                if (highlightedElementRef.current === element) {
                    element.style.outline = '';
                    element.style.outlineOffset = '';
                    highlightedElementRef.current = null;
                }
            }, 3000);
        } else {
            console.warn(`Could not find element for widget-id: ${widgetId}`);
        }
    };

    const hasAnyInteraction = coloredBoxes.some(box => box.interactionCount > 0);

    return (
        <div style={{ 
            display: "flex", 
            alignItems: "center", 
            marginTop: "1rem", 
            width: "400px",
            height: "45px",
            backgroundColor: hasAnyInteraction ? 'transparent' : '#eeeeee'
        }}>
            {coloredBoxes.map((box, index) => (
                <div key={index}>
                    <div
                        onClick={() => handleBoxClick(box.widgetId)}
                        data-tooltip-id={`widget-tooltip-${index}`}
                        data-tooltip-html={`<div>Widget Id: ${box.widgetId}<br>Interacted: ${box.interactionCount} times${box.lastInteractionTime ? `<br>Last Interacted: ${box.lastInteractionTime.toLocaleDateString()}:${box.lastInteractionTime.toLocaleTimeString()}` : ''}</div>`}
                        style={{
                            width: box.width,   // TODO: Ensure default is 15px
                            height: 45,
                            backgroundColor: box.interactionCount > 0 ? box.color : 'white',
                            cursor: 'pointer',
                            opacity: box.interactionCount > 0 ? 0.6 : 1,
                            transition: 'width 0.3s ease',
                            border: box.interactionCount > 0 ? '1px solid rgba(0, 0, 0, 0.3)' : `2px solid ${box.color}`,
                            boxSizing: 'border-box' // Ensure border is included in width/height
                        }}
                    />
                    <Tooltip style={{ zIndex: 100 }} id={`widget-tooltip-${index}`} />
                </div>
            ))}
        </div>
    )
}

export default AggregateView 
