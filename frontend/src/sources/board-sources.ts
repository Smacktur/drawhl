import { createContext } from 'react'

/**
 * Whether tasks on this board show their mark, and the tracker of a task that names none.
 * Marks show only once a board mixes trackers; with one tracker they would be noise.
 */
export const BoardSourcesContext = createContext({ mixed: false, defaultSource: '' })
