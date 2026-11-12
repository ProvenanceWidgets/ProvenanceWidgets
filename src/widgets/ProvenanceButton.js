import { TEMPORAL_B64, AGGREGATE_B64, DISABLED_B64 } from "../shared/logic/footprintIcons.js";
import { getClippingBadgeColor, CLIPPING_BADGE_BACKGROUND } from "../shared/logic/clippingBadgeColor.js";
import { NO_HIDDEN_RECORDS } from "../shared/logic/scalability/strategies/clipping/clippingNotice.js";
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
    const [panelOpen, setPanelOpen] = useState(false);
    const [registeredComponents] = useProvenance()
    const [widgetColors] = useWidgetColors()
    const { registrations } = useWidgetRegistry();
    const buttonRef = useRef(null);
    const [overClippingBadge, setOverClippingBadge] = useState(false);
    const clippingPopupOpen = overClippingBadge;

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
    const clippingMessage = registration?.clippingMessage ?? null;
    const showClippingBadge = Boolean(clippingMessage) && clippingMessage !== NO_HIDDEN_RECORDS;
    const hasClippedHistory = showClippingBadge && clippingMessage !== NO_HIDDEN_RECORDS;
    useEffect(() => {
        setOverClippingBadge(false);
    }, [target, showClippingBadge]);
    const clippingTooltipId = `provenance-clipping-tooltip-${safeTarget}`;
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

    // Panel visibility is separate from the aggregate/temporal view selection.
    useEffect(() => {
        setPanelOpen(false);
        const handlePanelVisibility = event => {
            if (event.detail?.target === target) setPanelOpen(Boolean(event.detail.open));
        };
        window.addEventListener("provenance-panel-visibility", handlePanelVisibility);
        return () => window.removeEventListener("provenance-panel-visibility", handlePanelVisibility);
    }, [target]);

    useEffect(() => {
        const handleVisibility = event => {
            if (event.detail?.target !== target) return;
            setOpen(Boolean(event.detail.open));
        };
        window.addEventListener(
            "provenance-dropdown-visibility",
            handleVisibility
        );
        window.addEventListener(
            "provenance-timeline-visibility",
            handleVisibility
        );
        return () => {
            window.removeEventListener("provenance-dropdown-visibility", handleVisibility);
            window.removeEventListener("provenance-timeline-visibility", handleVisibility);
        };
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
        position: "relative",
        ...(borderColor ? { 
            border: `2px solid ${borderColor}`,
            borderRadius: "4px",
            padding: "0px"
        } : {}),
        ...((open || panelOpen) && !isDisabled ? {
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
                <div style={{ position: 'relative' }}>
                    <div
                        style={wrapperStyle}
                        data-tooltip-id={clippingMessage ? undefined : viewTooltipId}
                        data-tooltip-place="right"
                        data-tooltip-delay-show={
                            PROVENANCE_BUTTON_TOOLTIP_DELAY_MS
                        }
                        aria-label={viewTooltipLabel}
                    >
                        <Button
                            ref={buttonRef}
                            className="provenance-button"
                            data-tooltip-place="right"
                            data-tooltip-delay-show={PROVENANCE_BUTTON_TOOLTIP_DELAY_MS}
                            aria-label={`Toggle provenance view for ${target}`}
                            data-provenance-state={buttonState}
                            data-tooltip-id={(!isSelectionGroup && !isDropdown) ? "open-tooltip-" + target : clippingMessage ? viewTooltipId : undefined}
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
                    {showClippingBadge && (
                        <button
                            type="button"
                            aria-label={clippingMessage}
                            aria-expanded={clippingPopupOpen}
                            onPointerDown={event => event.stopPropagation()}
                            onMouseEnter={() => setOverClippingBadge(true)}
                            onMouseLeave={() => setOverClippingBadge(false)}
                            onClick={event => {
                                event.stopPropagation();
                            }}
                            data-provenance-clipping-notice={target}
                            data-provenance-chart-target={target}
                            data-tooltip-id={clippingTooltipId}
                            data-tooltip-content={clippingMessage}
                            style={{
                                position: 'absolute', right: -5, bottom: -5,
                                width: 16, height: 16, padding: 0, borderRadius: '50%',
                                color: getClippingBadgeColor(), lineHeight: 0,
                                background: CLIPPING_BADGE_BACKGROUND,
                                border: '2px solid #fff',
                                boxSizing: 'border-box', cursor: 'pointer', zIndex: 2,
                                pointerEvents: 'auto',
                            }}
                        >
                            <svg
                                aria-hidden="true"
                                focusable="false"
                                viewBox="0 0 24 24"
                                width="11"
                                height="11"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    position: 'absolute', left: '50%', top: '50%',
                                    transform: 'translate(-50%, -50%)', display: 'block',
                                    pointerEvents: 'none',
                                }}
                            >
                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                                <circle cx="12" cy="12" r="2.5" />
                                {hasClippedHistory && <path d="M4 3 20 21" />}
                            </svg>
                        </button>
                    )}
                </div>

                {clippingMessage && typeof document !== 'undefined' && createPortal(
                    <Tooltip
                        id={clippingTooltipId}
                        isOpen={clippingPopupOpen}
                        hidden={!clippingPopupOpen}
                        events={['hover']}
                        clickable={false}
                        place="right"
                        positionStrategy="fixed"
                        delayShow={0}
                        delayHide={0}
                        opacity={1}
                        arrowColor={FOOTPRINT_TOOLTIP_BACKGROUND}
                        style={{
                            // Use the same compact metrics as the other simple React tooltips.
                            zIndex: FOOTPRINT_TOOLTIP_Z_INDEX,
                            backgroundColor: FOOTPRINT_TOOLTIP_BACKGROUND,
                            color: '#fff',
                            fontSize: '90%',
                            fontWeight: 400,
                            lineHeight: 'normal',
                            pointerEvents: 'none',
                        }}
                    />,
                    document.body
                )}

                {viewTooltip && typeof document !== 'undefined' &&
                    createPortal(
                        <Tooltip
                            id={viewTooltipId}
                            hidden={clippingPopupOpen}
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
