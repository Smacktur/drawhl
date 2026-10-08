import { createContext, useContext } from 'react'

/** True on a board the person can only view: elements hide their editing controls. */
export const ReadOnlyContext = createContext(false)

export const useReadOnly = () => useContext(ReadOnlyContext)
