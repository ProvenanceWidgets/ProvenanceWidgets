import { useState, useRef, useEffect, useMemo } from 'react';
import { Tooltip } from 'react-tooltip';
import useProvenance from '../provenance/hooks/useProvenance.js';
import useWidgetColors from '../provenance/hooks/useWidgetColors.js';
import useWidgetRegistry from '../provenance/hooks/useWidgetRegistry.js';
import { getRegistrationElement } from '@provenance-widgets/core';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import {
    buildSuperAggregateBoxes,
    getSuperWidgetColorMap,
} from '../shared/logic/superProvenanceData.js';

const AggregateView = ({ target }) => {
    const [registeredComponents] = useProvenance()
    const [, setWidgetColors] = useWidgetColors()
    const { registrations, focusWidget } = useWidgetRegistry();
    const [coloredBoxes, setColoredBoxes] = useState([])
    const intervalRef = useRef(null);
    const lastWidgetCountRef = useRef(0);
    const highlightedElementRef = useRef(null);

    const colorScale = useMemo(() => scaleOrdinal(schemeCategory10), [])

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const updateColoredBoxes = () => {
            if (registeredComponents.size !== 0) {
                const sp = registeredComponents.get(target);
                if (sp && sp.registeredWidgets) {
                    const colorMap = getSuperWidgetColorMap(
                        sp,
                        index => colorScale(index)
                    );
                    setWidgetColors(previous => {
                        const changed = Object.entries(colorMap).some(
                            ([widgetId, color]) =>
                                previous[widgetId] !== color
                        );
                        return changed
                            ? { ...previous, ...colorMap }
                            : previous;
                    });

                    const boxes = buildSuperAggregateBoxes({
                        superProvenance: sp,
                        getColor: index => colorScale(index),
                    });

                    setColoredBoxes(boxes);
                    lastWidgetCountRef.current = boxes.length;
                    return boxes.length > 0;
                }
            }
            if (lastWidgetCountRef.current !== 0) {
                lastWidgetCountRef.current = 0;
                setColoredBoxes([]);
            }
            return false;
        };

        updateColoredBoxes();

        intervalRef.current = setInterval(() => {
            updateColoredBoxes();
        }, 200);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (highlightedElementRef.current) {
                highlightedElementRef.current.style.outline = '';
                highlightedElementRef.current.style.outlineOffset = '';
                highlightedElementRef.current = null;
            }
        };
    }, [registeredComponents, target, colorScale]);

    const handleBoxClick = (widgetId) => {
        if (highlightedElementRef.current) {
            highlightedElementRef.current.style.outline = '';
            highlightedElementRef.current.style.outlineOffset = '';
            highlightedElementRef.current = null;
        }

        const registration = registrations.get(widgetId);
        let element = getRegistrationElement(registration);
        if (registration) {
            focusWidget(widgetId);
        }
        
        const containerClass = `.${widgetId}`;
        const container = element
            ? null
            : document.querySelector(containerClass);
        if (!element && container) {
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
        
        if (!element) {
            element = document.getElementById(widgetId);
        }
        
        if (!element && (widgetId.includes('checkbox') || widgetId.includes('Checkbox'))) {
            const checkboxGroupContainer = document.querySelector('.checkbox-group');
            if (checkboxGroupContainer) {
                element = checkboxGroupContainer;
            }
        }
        
        if (!element && (widgetId.includes('radiobutton') || widgetId.includes('Radiobutton'))) {
            const radioGroupContainer = document.querySelector('.radiobutton-group');
            if (radioGroupContainer) {
                element = radioGroupContainer;
            }
        }
        
        if (!element) {
            element = document.querySelector(`[id="${widgetId}"]`);
        }
        
        if (!element) {
            element = document.querySelector(`[data-widget-id="${widgetId}"]`);
        }
        
        if (!element) {
            const allInputs = document.querySelectorAll('input, [role="slider"]');
            for (const input of allInputs) {
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
            element.style.outline = '3px solid #007bff';
            element.style.outlineOffset = '2px';
            element.style.transition = 'outline 0.2s ease';
            highlightedElementRef.current = element;

            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

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

    return (
        <div
            data-provenance-aggregate-view={target}
            style={{
            display: "flex", 
            alignItems: "center", 
            marginTop: "1rem", 
            width: "400px",
            height: "45px",
            // Empty widget outlines initially occupy only part of the track.
            // Keep the unused capacity visible; interacted segments already
            // expand to the full 400px and naturally cover this background.
            backgroundColor: '#eeeeee'
        }}>
            {coloredBoxes.map((box, index) => (
                <div key={index}>
                    <div
                        onClick={() => handleBoxClick(box.widgetId)}
                        data-tooltip-id={`widget-tooltip-${index}`}
                        data-tooltip-html={`<div>Widget Id: ${box.widgetId}<br>Interacted: ${box.interactionCount} times${box.lastInteractionTime ? `<br>Last Interacted: ${box.lastInteractionTime.toLocaleDateString()}:${box.lastInteractionTime.toLocaleTimeString()}` : ''}</div>`}
                        style={{
                            width: box.width,
                            height: 45,
                            backgroundColor: box.interactionCount > 0
                                ? box.color
                                : 'white',
                            cursor: 'pointer',
                            opacity: box.interactionCount > 0 ? 0.6 : 1,
                            transition: 'width 0.3s ease',
                            border: box.interactionCount > 0
                                ? '1px solid rgba(0, 0, 0, 0.3)'
                                : `2px solid ${box.color}`,
                            boxSizing: 'border-box'
                        }}
                    />
                    <Tooltip style={{ zIndex: 100 }} id={`widget-tooltip-${index}`} />
                </div>
            ))}
        </div>
    )
}

export default AggregateView 
