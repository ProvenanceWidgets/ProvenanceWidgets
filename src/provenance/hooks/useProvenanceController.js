import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { ProvenanceController } from "@provenance-widgets/core";

/**
 * Connects the framework-independent controller to the React lifecycle.
 *
 * `id` and `widgetType` identify a widget and should remain stable for the
 * lifetime of a mounted component.
 */
const useProvenanceController = ({
    id,
    widgetType,
    value,
    provenance,
    mode = "interaction",
    sampleIntervalMs = 1000,
    freeze = false,
    visualize = true,
    onProvenanceChange,
    strategy,
    strategyFactory,
    now,
    scheduler,
    valuesEqual,
}) => {
    const [, render] = useReducer(count => count + 1, 0);
    const initialProvenanceRef = useRef(provenance);

    const controller = useMemo(
        () => new ProvenanceController({
            id,
            widgetType,
            value,
            provenance: initialProvenanceRef.current,
            mode,
            sampleIntervalMs,
            freeze,
            visualize,
            onProvenanceChange,
            strategy,
            strategyFactory,
            now,
            scheduler,
            valuesEqual,
            autoStart: false,
        }),
        [id, widgetType]
    );

    useEffect(() => controller.subscribe(render), [controller]);

    useEffect(() => {
        controller.setOptions({
            mode,
            sampleIntervalMs,
            freeze,
            visualize,
            onProvenanceChange,
        });
    }, [
        controller,
        mode,
        sampleIntervalMs,
        freeze,
        visualize,
        onProvenanceChange,
    ]);

    const previousProvenanceRef = useRef(provenance);
    const previousValueRef = useRef(value);

    useEffect(() => {
        const provenanceIsBeingReplaced =
            provenance !== previousProvenanceRef.current;
        const controlledValueChanged = value !== previousValueRef.current;

        if (
            value !== undefined &&
            controlledValueChanged &&
            !provenanceIsBeingReplaced
        ) {
            controller.recordExternalChange(value);
        }
        previousValueRef.current = value;
    }, [controller, provenance, value]);

    useEffect(() => {
        if (
            provenance !== undefined &&
            provenance !== previousProvenanceRef.current
        ) {
            controller.replaceProvenance(provenance);
        }
        previousProvenanceRef.current = provenance;
    }, [controller, provenance]);

    // `stop`, unlike `dispose`, is safe when React Strict Mode replays effect
    // setup and cleanup during development.
    useEffect(() => {
        controller.start();
        return () => controller.stop();
    }, [controller]);

    const recordInteraction = useCallback(
        (nextValue, options) =>
            controller.recordInteraction(nextValue, options),
        [controller]
    );
    const recordExternalChange = useCallback(
        (nextValue, options) =>
            controller.recordExternalChange(nextValue, options),
        [controller]
    );
    const restoreValue = useCallback(
        (nextValue, options) =>
            controller.restoreValue(nextValue, options),
        [controller]
    );
    const replaceProvenance = useCallback(
        (nextProvenance, options) =>
            controller.replaceProvenance(nextProvenance, options),
        [controller]
    );
    const toggleView = useCallback(
        () => controller.toggleView(),
        [controller]
    );

    return {
        ...controller.getSnapshot(),
        controller,
        recordInteraction,
        recordExternalChange,
        restoreValue,
        replaceProvenance,
        toggleView,
    };
};

export default useProvenanceController;
