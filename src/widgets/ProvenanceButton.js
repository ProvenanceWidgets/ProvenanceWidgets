import { Button } from 'primereact/button/button.esm.js';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from 'react-tooltip';
import Chart from "./Chart.js"
import useProvenance from '../provenance/hooks/useProvenance.js';
import useWidgetColors from '../provenance/hooks/useWidgetColors.js';
import useWidgetRegistry from '../provenance/hooks/useWidgetRegistry.js';
import {
    getProvenanceButtonState,
    getProvenanceButtonTooltip,
    isInsideProvenanceInteraction,
    PROVENANCE_BUTTON_TOOLTIP_DELAY_MS,
} from '../shared/logic/provenanceButtonState.js';

const FOOTPRINT_TOOLTIP_BACKGROUND = '#495057';
const FOOTPRINT_TOOLTIP_Z_INDEX = 4000;
const footprintTooltipStyle = {
    zIndex: FOOTPRINT_TOOLTIP_Z_INDEX,
    width: 'max-content',
    maxWidth: 'min(335px, calc(100vw - 24px))',
    padding: '0.75rem',
    borderRadius: '6px',
    backgroundColor: FOOTPRINT_TOOLTIP_BACKGROUND,
    color: '#fff',
    boxShadow: '0 2px 12px 0 rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    lineHeight: 1.45,
};

const ProvenanceButton = ({ target }) => {
    const [open, setOpen] = useState()
    const [registeredComponents] = useProvenance()
    const [widgetColors] = useWidgetColors()
    const { registrations } = useWidgetRegistry();
    const buttonRef = useRef(null);

    const borderColor = widgetColors[target] || null;
    const haloColor = '#71e7fb';

    const handleClickOutside = (event) => {
        if (isInsideProvenanceInteraction({
            eventTarget: event.target,
            buttonElement: buttonRef.current,
            target,
        })) return;
        setOpen(false);
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [target]);

    const TEMPORAL_B64 = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iLTMgLTMgNjcuNDg3IDEwNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQogIDxnPg0KICA8cGF0aCBzdHJva2U9IiMyYzNlNTAiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSIjMmMzZTUwIiBkPSJNMzcuMjY3LDgzLjY4MWMtMi4zNDYsNS45MzItNC4xMzMsMTQuMTgzLDIuNjU1LDE1Ljk5YzEwLjQyNywyLjc3MiwxMS45MDctMTIuODk2LDExLjkwNy0xMi44OTYNCglMMzcuMjY3LDgzLjY4MXoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTYwLjc0Miw2My4zODZjMS41NTgtOC4xMTQsMS40NjctMjEuOTU3LTguMjcxLTI1LjM5NGMtMi40LTAuODQ4LTExLjQ2Ny0zLjAwNi0xNS4xMjYsMTIuOTU2DQoJYy0yLjY1MSwxMS42MTIsMS40ODgsMjUuNTM5LDEuNDg4LDI1LjUzOWwxNC43MjUsMy4xMzJDNTMuNTYsNzkuNjE4LDU5LjY5OCw2OC44MTQsNjAuNzQyLDYzLjM4NnoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTIxLjM2Niw0Ny4zMTljMS43MTYsNi4xNDIsMi42MzMsMTQuNTM0LTQuMzExLDE1LjYyM0M2LjQsNjQuNjExLDYuNTY1LDQ4Ljg3NSw2LjU2NSw0OC44NzVMMjEuMzY2LDQ3LjMxOXoNCgkiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTAuMTQ2LDI0LjY3OUMtMC41NTUsMTYuNDQ3LDAuOTgsMi42OSwxMS4wMjgsMC4yODdDMTMuNS0wLjMwNiwyMi43NDEtMS41MDEsMjQuNzExLDE0Ljc1NQ0KCWMxLjQzMSwxMS44MjctNC4xNTEsMjUuMjQzLTQuMTUxLDI1LjI0M2wtMTQuOTcsMS41NzVDNS41ODksNDEuNTczLDAuNjEyLDMwLjE5LDAuMTQ2LDI0LjY3OXoiLz4NCiAgICA8L2c+DQo8L3N2Zz4="
    const AGGREGATE_B64 = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iLTMgLTMgNjcuNDg3IDEwNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQogIDxnPg0KICA8cGF0aCBzdHJva2U9IiMyYzNlNTAiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSJub25lIiBkPSJNMzcuMjY3LDgzLjY4MWMtMi4zNDYsNS45MzItNC4xMzMsMTQuMTgzLDIuNjU1LDE1Ljk5YzEwLjQyNywyLjc3MiwxMS45MDctMTIuODk2LDExLjkwNy0xMi44OTYNCglMMzcuMjY3LDgzLjY4MXoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTYwLjc0Miw2My4zODZjMS41NTgtOC4xMTQsMS40NjctMjEuOTU3LTguMjcxLTI1LjM5NGMtMi40LTAuODQ4LTExLjQ2Ny0zLjAwNi0xNS4xMjYsMTIuOTU2DQoJYy0yLjY1MSwxMS42MTIsMS40ODgsMjUuNTM5LDEuNDg4LDI1LjUzOWwxNC43MjUsMy4xMzJDNTMuNTYsNzkuNjE4LDU5LjY5OCw2OC44MTQsNjAuNzQyLDYzLjM4NnoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTIxLjM2Niw0Ny4zMTljMS43MTYsNi4xNDIsMi42MzMsMTQuNTM0LTQuMzExLDE1LjYyM0M2LjQsNjQuNjExLDYuNTY1LDQ4Ljg3NSw2LjU2NSw0OC44NzVMMjEuMzY2LDQ3LjMxOXoNCgkiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTAuMTQ2LDI0LjY3OUMtMC41NTUsMTYuNDQ3LDAuOTgsMi42OSwxMS4wMjgsMC4yODdDMTMuNS0wLjMwNiwyMi43NDEtMS41MDEsMjQuNzExLDE0Ljc1NQ0KCWMxLjQzMSwxMS44MjctNC4xNTEsMjUuMjQzLTQuMTUxLDI1LjI0M2wtMTQuOTcsMS41NzVDNS41ODksNDEuNTczLDAuNjEyLDMwLjE5LDAuMTQ2LDI0LjY3OXoiLz4NCiAgICA8L2c+DQo8L3N2Zz4="
    const DISABLED_B64 = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iLTMgLTMgNjcuNDg3IDEwNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQogIDxnPg0KICAgIDxwYXRoIHN0cm9rZT0iIzdmOGM4ZCIgc3Ryb2tlLXdpZHRoPSI1cHgiIGZpbGw9Im5vbmUiIGQ9Ik0zNy4yNjcsODMuNjgxYy0yLjM0Niw1LjkzMi00LjEzMywxNC4xODMsMi42NTUsMTUuOTljMTAuNDI3LDIuNzcyLDExLjkwNy0xMi44OTYsMTEuOTA3LTEyLjg5NiBMMzcuMjY3LDgzLjY4MXoiLz4NCiAgICA8cGF0aCBzdHJva2U9IiM3ZjhjOGQiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSJub25lIiBkPSJNNjAuNzQyLDYzLjM4NmMxLjU1OC04LjExNCwxLjQ2Ny0yMS45NTctOC4yNzEtMjUuMzk0Yy0yLjQtMC44NDgtMTEuNDY3LTMuMDA2LTE1LjEyNiwxMi45NTYgYy0yLjY1MSwxMS42MTIsMS40ODgsMjUuNTM5LDEuNDg4LDI1LjUzOWwxNC43MjUsMy4xMzJDNTMuNTYsNzkuNjE4LDU5LjY5OCw2OC44MTQsNjAuNzQyLDYzLjM4NnoiLz4NCiAgICA8cGF0aCBzdHJva2U9IiM3ZjhjOGQiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSJub25lIiBkPSJNMjEuMzY2LDQ3LjMxOWMxLjcxNiw2LjE0MiwyLjYzMywxNC41MzQtNC4zMTEsMTUuNjIzQzYuNCw2NC42MTEsNi41NjUsNDguODc1LDYuNTY1LDQ4Ljg3NUwyMS4zNjYsNDcuMzE5eiIvPg0KICAgIDxwYXRoIHN0cm9rZT0iIzdmOGM4ZCIgc3Ryb2tlLXdpZHRoPSI1cHgiIGZpbGw9Im5vbmUiIGQ9Ik0wLjE0NiwyNC42NzlDLTAuNTU1LDE2LjQ0NywwLjk4LDIuNjksMTEuMDI4LDAuMjg3QzEzLjUtMC4zMDYsMjIuNzQxLTEuNTAxLDI0LjcxMSwxNC43NTUgYzEuNDMxLDExLjgyNy00LjE1MSwyNS4yNDMtNC4xNTEsMjUuMjQzbC0xNC45NywxLjU3NUM1LjU4OSw0MS41NzMsMC42MTIsMzAuMTkwLDAuMTQ2LDI0LjY3OXoiLz4NCiAgICA8bGluZSB4MT0iMCIgeTE9IjAiIHgyPSI2MCIgeTI9IjEwMCIgc3Ryb2tlPSIjN2Y4YzhkIiBzdHJva2Utd2lkdGg9IjUiLz4NCiAgPC9nPg0KPC9zdmc+"

    const provenance = registeredComponents.get(target);
    const registration = registrations.get(target);
    const buttonState = getProvenanceButtonState({
        provenance,
        visualize: registration?.visualize ?? true,
        open: Boolean(open),
    });
    const isDisabled = buttonState === "disabled";
    const viewTooltip = getProvenanceButtonTooltip(buttonState);
    const safeTarget = String(target ?? "widget")
        .replace(/[^a-zA-Z0-9_-]/g, "-");
    const viewTooltipId = `provenance-view-tooltip-${safeTarget}`;
    const viewTooltipLabel = viewTooltip
        ? [
            viewTooltip.title,
            viewTooltip.description,
            viewTooltip.action,
        ].filter(Boolean).join(". ")
        : undefined;

    const isSelectionGroup = (() => {
        if (!provenance || !provenance.detailedData) return false;
        
        if (
            registration?.type === "dropdown" ||
            registration?.type === "multiselect" ||
            (
                !registration &&
                typeof target === 'string' &&
                target.includes('dropdown')
            )
        ) {
            return false;
        }

        const entries = Array.from(provenance.detailedData.entries());
        if (entries.length === 0) return false;
        const firstValue = entries[0][1];
        return Array.isArray(firstValue) && firstValue.length > 0 && firstValue[0]?.select;
    })();

    const isDropdown = registration
        ? [
            "dropdown",
            "multiselect",
            "input-text",
            "range-slider",
            "single-slider",
        ].includes(registration.type)
        : typeof target === 'string' && (
            target.includes('dropdown') ||
            target === 'input-text' ||
            target === 'range-slider' ||
            target === 'single-slider'
        );

    const handleToggle = () => {
        if (isDisabled) return;
        setOpen(!open);
    };
    
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

    useEffect(() => {
        const handleVisibility = event => {
            if (event.detail?.target !== target) return;
            setOpen(Boolean(event.detail.open));
        };
        window.addEventListener(
            "provenance-dropdown-visibility",
            handleVisibility
        );
        return () => window.removeEventListener(
            "provenance-dropdown-visibility",
            handleVisibility
        );
    }, [target]);

    useEffect(() => {
        if (buttonState === "hidden" && open) {
            setOpen(false);
        }
    }, [buttonState, open]);

    const getIcon = () => {
        if (buttonState === "disabled") {
            return DISABLED_B64;
        }
        return buttonState === "temporal"
            ? TEMPORAL_B64
            : AGGREGATE_B64;
    };

    const buttonStyle = {
        width: "24px",
        height: "24px",
        padding: "0px",
        boxShadow: "none",
        ...(open && borderColor ? { backgroundColor: borderColor } : {})
    };

    const wrapperStyle = {
        display: "inline-block",
        ...(borderColor ? { 
            border: `2px solid ${borderColor}`,
            borderRadius: "4px",
            padding: "0px"
        } : {}),
        ...(open ? {
            boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${haloColor}`
        } : {})
    };

    if (buttonState === "hidden") return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", marginTop: "1rem", position: 'relative' }}>
            <style>{`
                .provenance-button:focus-visible {
                    outline: 2px solid ${haloColor};
                    outline-offset: 2px;
                }
            `}</style>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div
                    style={wrapperStyle}
                    data-tooltip-id={viewTooltipId}
                    data-tooltip-place="right"
                    data-tooltip-delay-show={
                        PROVENANCE_BUTTON_TOOLTIP_DELAY_MS
                    }
                    aria-label={viewTooltipLabel}
                >
                    <Button 
                        ref={buttonRef} 
                        className="provenance-button"
                        aria-label={`Toggle provenance view for ${target}`}
                        data-provenance-state={buttonState}
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
                                    filter: open ? 'brightness(0)' : 'none'
                                }}
                            />
                        )} 
                    />
                </div>

                {viewTooltip && typeof document !== 'undefined' &&
                    createPortal(
                        <Tooltip
                            id={viewTooltipId}
                            events={['hover']}
                            delayShow={PROVENANCE_BUTTON_TOOLTIP_DELAY_MS}
                            delayHide={0}
                            opacity={1}
                            place="right"
                            positionStrategy="fixed"
                            arrowColor={FOOTPRINT_TOOLTIP_BACKGROUND}
                            closeOnEsc
                            style={footprintTooltipStyle}
                        >
                            <div>
                                <strong
                                    style={{
                                        display: "block",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {viewTooltip.title}
                                </strong>
                                <div>{viewTooltip.description}</div>
                                {viewTooltip.action && (
                                    <div style={{ marginTop: "4px" }}>
                                        {viewTooltip.action}
                                    </div>
                                )}
                            </div>
                        </Tooltip>,
                        document.body
                    )}

                {isSelectionGroup &&
                    open &&
                    !registration?.rendersOwnTemporalHeader && (
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
            
        </div>
    )
}

export default ProvenanceButton
