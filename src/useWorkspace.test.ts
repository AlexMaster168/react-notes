import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWorkspace } from './useWorkspace'
import { EMPTY_WORKSPACE, STORAGE_KEY, newEntry } from './model'
const sample = () => ({ ...EMPTY_WORKSPACE, entries: [{ ...newEntry(), title: 'A task' }] })
describe('persistent workspace', () => {
  it('saves and undoes changes', () => {
    const { result } = renderHook(useWorkspace)
    act(() => {
      expect(result.current.commit(sample())).toBe(true)
    })
    expect(result.current.workspace.entries).toHaveLength(1)
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.workspace.entries).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(EMPTY_WORKSPACE)
  })
  it('leaves both state and saved data unchanged when storage is full', () => {
    const { result } = renderHook(useWorkspace)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    act(() => {
      expect(result.current.commit(sample())).toBe(false)
    })
    expect(result.current.workspace.entries).toHaveLength(0)
    expect(result.current.storageError).toBeTruthy()
  })
  it('blocks writes to corrupted data until explicit recovery', () => {
    localStorage.setItem(STORAGE_KEY, 'broken')
    const { result } = renderHook(useWorkspace)
    act(() => {
      expect(result.current.commit(sample())).toBe(false)
    })
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken')
    act(() => {
      expect(result.current.recover(sample())).toBe(true)
    })
    expect(result.current.storageError).toBeNull()
    expect(result.current.workspace.entries).toHaveLength(1)
  })
  it('syncs other tabs and resets undo to avoid overwriting their changes', () => {
    const { result } = renderHook(useWorkspace)
    act(() => result.current.commit(sample()))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPTY_WORKSPACE))
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY })))
    expect(result.current.workspace.entries).toHaveLength(0)
    expect(result.current.canUndo).toBe(false)
  })
})
