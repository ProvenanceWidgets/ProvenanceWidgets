import { createContext, useContext } from "react";

const RadioGroupContext = createContext(null);

export const useRadioGroup = () => useContext(RadioGroupContext);

export default RadioGroupContext;
