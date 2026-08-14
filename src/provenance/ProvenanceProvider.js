import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
    getRegistrationElement,
    normalizeWidgetRegistration,
    registerWidgetInMap,
    unregisterWidgetFromMap,
} from '@provenance-widgets/core';
import ProvenanceContext from "./ProvenanceContext.js";

const ProvenanceProvider = ({ children }) => {
    const reactId = useId();
    const tooltipId = useMemo(
        () => `provenance-widget-tooltip-${reactId.replace(/:/g, '')}`,
        [reactId]
    );
    const [registeredComponents, setRegisteredComponents] = useState(new Map())
    const [widgetRegistrations, setWidgetRegistrations] = useState(new Map())
    const widgetRegistrationsRef = useRef(widgetRegistrations);
    const [widgetColors, setWidgetColors] = useState({})
    const [revertedValues, setRevertedValues] = useState({})
    const [activeTooltip, setActiveTooltip] = useState(null);

    const unregisterWidget = useCallback((id, expectedRegistration) => {
        const currentRegistrations = widgetRegistrationsRef.current;
        const registration =
            expectedRegistration ?? currentRegistrations.get(id);
        const nextRegistrations = unregisterWidgetFromMap(
            currentRegistrations,
            id,
            expectedRegistration
        );
        if (nextRegistrations === currentRegistrations) return false;

        widgetRegistrationsRef.current = nextRegistrations;
        setWidgetRegistrations(nextRegistrations);
        setRegisteredComponents(previous => {
            if (
                !(previous instanceof Map) ||
                previous.get(id) !== registration?.provenance
            ) {
                return previous;
            }
            const next = new Map(previous);
            next.delete(id);
            return next;
        });
        return true;
    }, []);

    const registerWidget = useCallback(registration => {
        const normalized = normalizeWidgetRegistration(registration);
        const nextRegistrations = registerWidgetInMap(
            widgetRegistrationsRef.current,
            normalized
        );
        widgetRegistrationsRef.current = nextRegistrations;
        setWidgetRegistrations(nextRegistrations);

        setRegisteredComponents(previous => {
            const next = previous instanceof Map
                ? new Map(previous)
                : new Map();
            next.set(normalized.id, normalized.provenance);
            return next;
        });

        return () => unregisterWidget(normalized.id, normalized);
    }, [unregisterWidget]);

    const notifyWidget = useCallback(id => {
        const registration = widgetRegistrationsRef.current.get(id);
        if (!registration) return false;

        const nextRegistrations = new Map(widgetRegistrationsRef.current);
        widgetRegistrationsRef.current = nextRegistrations;
        setWidgetRegistrations(nextRegistrations);
        setRegisteredComponents(previous => {
            const next = previous instanceof Map
                ? new Map(previous)
                : new Map();
            next.set(id, registration.provenance);
            return next;
        });
        return true;
    }, []);

    const getWidgetRegistration = useCallback(
        id => widgetRegistrationsRef.current.get(id),
        []
    );

    const restoreWidgetValue = useCallback(
        (id, value, source = "history") => {
            const registration = widgetRegistrationsRef.current.get(id);
            if (!registration) return false;
            return registration.setValue(value, source) !== false;
        },
        []
    );

    const focusWidget = useCallback(id => {
        const registration = widgetRegistrationsRef.current.get(id);
        if (!registration) return false;
        if (typeof registration.focus === "function") {
            registration.focus();
            return true;
        }
        const element = getRegistrationElement(registration);
        if (!element) return false;
        element.focus?.();
        element.scrollIntoView?.({ behavior: "smooth", block: "center" });
        return true;
    }, []);

    const getPosition = useCallback((event) => {
        const source = event?.nativeEvent ?? event;
        if (Number.isFinite(source?.clientX) && Number.isFinite(source?.clientY)) {
            const viewportWidth = typeof window === 'undefined' ? Infinity : window.innerWidth;
            const viewportHeight = typeof window === 'undefined' ? Infinity : window.innerHeight;
            return {
                left: Math.min(source.clientX + 10, viewportWidth - 12),
                top: Math.min(source.clientY + 10, viewportHeight - 12),
                flipX: source.clientX > viewportWidth / 2,
                flipY: source.clientY > viewportHeight / 2,
            };
        }

        const rect = event?.currentTarget?.getBoundingClientRect?.();
        return rect
            ? {
                left: rect.right + 10,
                top: rect.top + (rect.height / 2),
                flipX: false,
                flipY: false,
            }
            : { left: 10, top: 10, flipX: false, flipY: false };
    }, []);

    const showTooltip = useCallback((content, event) => {
        if (!content) return;
        setActiveTooltip({ content, ...getPosition(event) });
    }, [getPosition]);

    const moveTooltip = useCallback((event, content) => {
        const position = getPosition(event);
        setActiveTooltip(current => current
            ? {
                ...current,
                ...(content ? { content } : {}),
                ...position,
            }
            : content
                ? { content, ...position }
                : current
        );
    }, [getPosition]);

    const hideTooltip = useCallback(() => {
        setActiveTooltip(null);
    }, []);

    useEffect(() => {
        document.addEventListener('pointerdown', hideTooltip);
        window.addEventListener('blur', hideTooltip);
        return () => {
            document.removeEventListener('pointerdown', hideTooltip);
            window.removeEventListener('blur', hideTooltip);
        };
    }, [hideTooltip]);

    const tooltip = useMemo(() => ({
        id: tooltipId,
        show: showTooltip,
        move: moveTooltip,
        hide: hideTooltip,
    }), [tooltipId, showTooltip, moveTooltip, hideTooltip]);

    const value = useMemo(() => ({
        tooltipId,
        tooltip,
        state: {
            registeredComponents,
            widgetRegistrations,
            widgetColors,
            revertedValues,
        },
        actions: {
            setRegisteredComponents,
            registerWidget,
            unregisterWidget,
            notifyWidget,
            getWidgetRegistration,
            restoreWidgetValue,
            focusWidget,
            setWidgetColors,
            setRevertedValues,
        },
    }), [
        tooltipId,
        tooltip,
        registeredComponents,
        widgetRegistrations,
        widgetColors,
        revertedValues,
        registerWidget,
        unregisterWidget,
        notifyWidget,
        getWidgetRegistration,
        restoreWidgetValue,
        focusWidget,
    ])

    return (
        <ProvenanceContext.Provider value={value}>
            {children}
            {activeTooltip && typeof document !== 'undefined' && createPortal(
                <div
                    id={tooltipId}
                    role="tooltip"
                    data-provenance-widget-tooltip="true"
                    style={{
                        position: 'fixed',
                        left: activeTooltip.left,
                        top: activeTooltip.top,
                        zIndex: 3000,
                        whiteSpace: 'pre-line',
                        textAlign: 'left',
                        width: 'max-content',
                        maxWidth: 'min(420px, calc(100vw - 24px))',
                        padding: '10px',
                        borderRadius: '5px',
                        color: 'var(--text-color, #212529)',
                        backgroundColor: 'var(--surface-100, #f8f9fa)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        pointerEvents: 'none',
                        transform: `translate(${activeTooltip.flipX ? '-100%' : '0'}, ${activeTooltip.flipY ? '-100%' : '0'})`,
                    }}
                >
                    {activeTooltip.content}
                </div>,
                document.body
            )}
        </ProvenanceContext.Provider>
    )
}

export default ProvenanceProvider
