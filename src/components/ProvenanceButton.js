import { Button } from 'primereact/button/button.esm.js';
import { useState, useRef, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import Chart from "./Chart.js"
import useProvenance from './hooks/useProvenance.js';
import useWidgetColors from './hooks/useWidgetColors.js';

const ProvenanceButton = ({ target }) => {
    const [open, setOpen] = useState()
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const [widgetColors] = useWidgetColors()
    const buttonRef = useRef(null);

    // Get border color from widgetColors state (set by AggregateView)
    const borderColor = widgetColors[target] || null;
    const haloColor = '#71e7fb';
    
    // Determine if background is dark (when open and borderColor is set)
    const backgroundColor = open && borderColor ? borderColor : null;

    const handleClickOutside = (event) => {
        if (buttonRef.current && !buttonRef.current.contains(event.target)) {
            console.log('Clicked outside the button!');
            setOpen(false); // Example action: hide content
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const TEMPORAL_B64 = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iLTMgLTMgNjcuNDg3IDEwNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQogIDxnPg0KICA8cGF0aCBzdHJva2U9IiMyYzNlNTAiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSIjMmMzZTUwIiBkPSJNMzcuMjY3LDgzLjY4MWMtMi4zNDYsNS45MzItNC4xMzMsMTQuMTgzLDIuNjU1LDE1Ljk5YzEwLjQyNywyLjc3MiwxMS45MDctMTIuODk2LDExLjkwNy0xMi44OTYNCglMMzcuMjY3LDgzLjY4MXoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTYwLjc0Miw2My4zODZjMS41NTgtOC4xMTQsMS40NjctMjEuOTU3LTguMjcxLTI1LjM5NGMtMi40LTAuODQ4LTExLjQ2Ny0zLjAwNi0xNS4xMjYsMTIuOTU2DQoJYy0yLjY1MSwxMS42MTIsMS40ODgsMjUuNTM5LDEuNDg4LDI1LjUzOWwxNC43MjUsMy4xMzJDNTMuNTYsNzkuNjE4LDU5LjY5OCw2OC44MTQsNjAuNzQyLDYzLjM4NnoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTIxLjM2Niw0Ny4zMTljMS43MTYsNi4xNDIsMi42MzMsMTQuNTM0LTQuMzExLDE1LjYyM0M2LjQsNjQuNjExLDYuNTY1LDQ4Ljg3NSw2LjU2NSw0OC44NzVMMjEuMzY2LDQ3LjMxOXoNCgkiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTAuMTQ2LDI0LjY3OUMtMC41NTUsMTYuNDQ3LDAuOTgsMi42OSwxMS4wMjgsMC4yODdDMTMuNS0wLjMwNiwyMi43NDEtMS41MDEsMjQuNzExLDE0Ljc1NQ0KCWMxLjQzMSwxMS44MjctNC4xNTEsMjUuMjQzLTQuMTUxLDI1LjI0M2wtMTQuOTcsMS41NzVDNS41ODksNDEuNTczLDAuNjEyLDMwLjE5LDAuMTQ2LDI0LjY3OXoiLz4NCiAgICA8L2c+DQo8L3N2Zz4="
    const AGGREGATE_B64 = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iLTMgLTMgNjcuNDg3IDEwNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQogIDxnPg0KICA8cGF0aCBzdHJva2U9IiMyYzNlNTAiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSJub25lIiBkPSJNMzcuMjY3LDgzLjY4MWMtMi4zNDYsNS45MzItNC4xMzMsMTQuMTgzLDIuNjU1LDE1Ljk5YzEwLjQyNywyLjc3MiwxMS45MDctMTIuODk2LDExLjkwNy0xMi44OTYNCglMMzcuMjY3LDgzLjY4MXoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTYwLjc0Miw2My4zODZjMS41NTgtOC4xMTQsMS40NjctMjEuOTU3LTguMjcxLTI1LjM5NGMtMi40LTAuODQ4LTExLjQ2Ny0zLjAwNi0xNS4xMjYsMTIuOTU2DQoJYy0yLjY1MSwxMS42MTIsMS40ODgsMjUuNTM5LDEuNDg4LDI1LjUzOWwxNC43MjUsMy4xMzJDNTMuNTYsNzkuNjE4LDU5LjY5OCw2OC44MTQsNjAuNzQyLDYzLjM4NnoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTIxLjM2Niw0Ny4zMTljMS43MTYsNi4xNDIsMi42MzMsMTQuNTM0LTQuMzExLDE1LjYyM0M2LjQsNjQuNjExLDYuNTY1LDQ4Ljg3NSw2LjU2NSw0OC44NzVMMjEuMzY2LDQ3LjMxOXoNCgkiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTAuMTQ2LDI0LjY3OUMtMC41NTUsMTYuNDQ3LDAuOTgsMi42OSwxMS4wMjgsMC4yODdDMTMuNS0wLjMwNiwyMi43NDEtMS41MDEsMjQuNzExLDE0Ljc1NQ0KCWMxLjQzMSwxMS44MjctNC4xNTEsMjUuMjQzLTQuMTUxLDI1LjI0M2wtMTQuOTcsMS41NzVDNS41ODksNDEuNTczLDAuNjEyLDMwLjE5LDAuMTQ2LDI0LjY3OXoiLz4NCiAgICA8L2c+DQo8L3N2Zz4="
    const DISABLED_B64 = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iLTMgLTMgNjcuNDg3IDEwNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQogIDxnPg0KICAgIDxwYXRoIHN0cm9rZT0iIzdmOGM4ZCIgc3Ryb2tlLXdpZHRoPSI1cHgiIGZpbGw9Im5vbmUiIGQ9Ik0zNy4yNjcsODMuNjgxYy0yLjM0Niw1LjkzMi00LjEzMywxNC4xODMsMi42NTUsMTUuOTljMTAuNDI3LDIuNzcyLDExLjkwNy0xMi44OTYsMTEuOTA3LTEyLjg5NiBMMzcuMjY3LDgzLjY4MXoiLz4NCiAgICA8cGF0aCBzdHJva2U9IiM3ZjhjOGQiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSJub25lIiBkPSJNNjAuNzQyLDYzLjM4NmMxLjU1OC04LjExNCwxLjQ2Ny0yMS45NTctOC4yNzEtMjUuMzk0Yy0yLjQtMC44NDgtMTEuNDY3LTMuMDA2LTE1LjEyNiwxMi45NTYgYy0yLjY1MSwxMS42MTIsMS40ODgsMjUuNTM5LDEuNDg4LDI1LjUzOWwxNC43MjUsMy4xMzJDNTMuNTYsNzkuNjE4LDU5LjY5OCw2OC44MTQsNjAuNzQyLDYzLjM4NnoiLz4NCiAgICA8cGF0aCBzdHJva2U9IiM3ZjhjOGQiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSJub25lIiBkPSJNMjEuMzY2LDQ3LjMxOWMxLjcxNiw2LjE0MiwyLjYzMywxNC41MzQtNC4zMTEsMTUuNjIzQzYuNCw2NC42MTEsNi41NjUsNDguODc1LDYuNTY1LDQ4Ljg3NUwyMS4zNjYsNDcuMzE5eiIvPg0KICAgIDxwYXRoIHN0cm9rZT0iIzdmOGM4ZCIgc3Ryb2tlLXdpZHRoPSI1cHgiIGZpbGw9Im5vbmUiIGQ9Ik0wLjE0NiwyNC42NzlDLTAuNTU1LDE2LjQ0NywwLjk4LDIuNjksMTEuMDI4LDAuMjg3QzEzLjUtMC4zMDYsMjIuNzQxLTEuNTAxLDI0LjcxMSwxNC43NTUgYzEuNDMxLDExLjgyNy00LjE1MSwyNS4yNDMtNC4xNTEsMjUuMjQzbC0xNC45NywxLjU3NUM1LjU4OSw0MS41NzMsMC42MTIsMzAuMTkwLDAuMTQ2LDI0LjY3OXoiLz4NCiAgICA8bGluZSB4MT0iMCIgeTE9IjAiIHgyPSI2MCIgeTI9IjEwMCIgc3Ryb2tlPSIjN2Y4YzhkIiBzdHJva2Utd2lkdGg9IjUiLz4NCiAgPC9nPg0KPC9zdmc+"

    // Check if component is registered and has interactions
    const provenance = registeredComponents.get(target);
    const hasInteractions = provenance &&
        provenance.detailedData &&
        provenance.detailedData.size > 0 &&
        // SS/RS retain an internal baseline like PW 1.0, but that baseline is
        // not itself a user interaction and must not enable the footprint.
        provenance.hasUserInteracted !== false;
    const isDisabled = !provenance || !hasInteractions;

    // Check if this is a checkbox/radio group to render in-situ (Timeline)
    // We EXCLUDE single-select dropdowns from this "isSelectionGroup" logic
    // because single-select dropdowns should use a dropdown div view, not in-situ timeline.
    const isSelectionGroup = (() => {
        if (!provenance || !provenance.detailedData) return false;
        
        // Explicitly exclude dropdowns from in-situ rendering
        if (typeof target === 'string' && target.includes('dropdown')) {
            return false;
        }

        const entries = Array.from(provenance.detailedData.entries());
        if (entries.length === 0) return false;
        const firstValue = entries[0][1];
        // Check if it matches SelectionProvenance structure (Array of records with select property)
        return Array.isArray(firstValue) && firstValue.length > 0 && firstValue[0]?.select;
    })();

    // Check if this is a dropdown
    // This now includes 'input-text', 'range-slider', and 'single-slider' because we want to trigger a dropdown-style view for them too.
    const isDropdown = typeof target === 'string' && (
        target.includes('dropdown') ||
        target === 'input-text' ||
        target === 'range-slider' ||
        target === 'single-slider'
    );

    const handleToggle = () => {
        if (isDisabled) return;
        
        const newOpen = !open;
        setOpen(newOpen);
        
        // If it's a dropdown or input-text or range-slider, we want to programmatically open the adjacent dropdown component
        // The dropdown component has the same ID as `target` or is related to it.
        if (isDropdown) {
            const event = new CustomEvent('provenance-dropdown-toggle', { 
                detail: { target, open: newOpen } 
            });
            window.dispatchEvent(event);
        }
    };
    
    // For selection groups, we no longer render the chart body here.
    // The "timeline" state should be exposed to the parent context so Checkbox/Radio components can read it.
    // However, since those components are siblings/children, we need a way to pass this "open" state.
    // We can use a context or simply dispatch a custom event, or rely on the fact that ProvenanceButton 
    // is inside the Group component in index.js? No, it's a sibling in the div structure in index.js.
    // 
    // In index.js:
    // <div className="checkbox-group">
    //    <div><ProvenanceButton target="checkbox-group" /></div>
    //    <CheckboxGroup id="checkbox-group">...</CheckboxGroup>
    // </div>
    //
    // They are siblings. We need a shared state.
    // For now, we can use a simple global event or a new Context if we could wrap them.
    // But since we can't easily change the tree structure, let's use a custom event on the document 
    // or window to signal "toggle timeline view" for a specific target.
    
    useEffect(() => {
        if (isSelectionGroup) {
            const event = new CustomEvent('provenance-timeline-toggle', { 
                detail: { target, open } 
            });
            window.dispatchEvent(event);
        }
    }, [open, target, isSelectionGroup]);

    useEffect(() => {
        if (isDropdown) {
            const event = new CustomEvent('provenance-dropdown-toggle', {
                detail: { target, open }
            });
            window.dispatchEvent(event);
        }
    }, [open, target, isDropdown]);

    // Determine which icon to show
    const getIcon = () => {
        // Show disabled if component is not registered or has no interactions
        if (isDisabled) {
            return DISABLED_B64;
        }
        // Show active icons only if component has interactions
        return open ? TEMPORAL_B64 : AGGREGATE_B64;
    };

    // Build button style - set background color to border color when open
    // Reduced size from 40x40 to 24x24 as requested to make more room for timeline
    const buttonStyle = {
        width: "24px",
        height: "24px",
        padding: "0px",
        boxShadow: "none",
        ...(open && borderColor ? { backgroundColor: borderColor } : {})
    };

    // Build wrapper style with border
    const wrapperStyle = {
        display: "inline-block",
        ...(borderColor ? { 
            border: `2px solid ${borderColor}`,
            borderRadius: "4px",
            padding: "0px"
        } : {}),
        // Preserve the widget-colored resting border above; only the additional
        // halo shown while provenance is open uses the shared theme color.
        ...(open ? {
            boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${haloColor}`
        } : {})
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", marginTop: "1rem", position: 'relative' }}>
            <style>{`
                .provenance-button:focus-visible {
                    outline: 2px solid ${haloColor};
                    outline-offset: 2px;
                }
            `}</style>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={wrapperStyle}>
                    <Button 
                        ref={buttonRef} 
                        className="provenance-button"
                        data-tooltip-id={(!isSelectionGroup && !isDropdown) ? "open-tooltip-" + target : undefined}
                        onClick={handleToggle} 
                        disabled={isDisabled}
                        style={buttonStyle} 
                        text 
                        icon={(options) => (
                            <img 
                                width={18} // Reduced icon size
                                height={18} 
                                src={getIcon()} 
                                style={{
                                    // When open, use brightness(0) to make it black.
                                    // Original logic: filter: open ? 'brightness(0) invert(1)' : 'none'
                                    // 'invert(1)' on black makes it white.
                                    // We want BLACK. So just 'brightness(0)' should force black if not already.
                                    // If the icon is already dark, 'none' works.
                                    // If we want to FORCE black regardless of what it was, brightness(0) works.
                                    filter: open ? 'brightness(0)' : 'none'
                                }}
                            />
                        )} 
                    />
                </div>
                
                {/* For selection groups, render HEADER beside the button when open */}
                {isSelectionGroup && open && (
                     <div style={{ flexGrow: 1, marginLeft: '10px' }}>
                         <Chart target={target} part="header" />
                     </div>
                )}

                {(!isSelectionGroup && !isDropdown) && (
                    <Tooltip
                        id={"open-tooltip-" + target}
                        events={['click']}
                        isOpen={open}
                        opacity={1}
                        place="right"
                        positionStrategy="fixed"
                        style={{ zIndex: 100 }}
                        clickable
                    >
                        {open && <Chart target={target} />}
                    </Tooltip>
                )}
            </div>
            
            {/* We NO LONGER render the dropdown div here. It is handled by the SingleSelectDropdown component itself via event. */}
        </div>
    )
}

export default ProvenanceButton
