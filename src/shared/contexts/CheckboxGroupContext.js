import { createContext, useContext } from "react";

const CheckboxGroupContext = createContext(null);

export const useCheckboxGroup = () =>
    useContext(CheckboxGroupContext);

export default CheckboxGroupContext;
