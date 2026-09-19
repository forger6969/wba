import { createContext, useContext, useEffect, useState } from 'react';
import { useParentChildren } from './queries.js';

const ChildCtx = createContext(null);

export function ChildProvider({ children }) {
  const { data } = useParentChildren();
  const childList = data?.data || [];
  const [requestedChildId, setRequestedChildId] = useState(() => localStorage.getItem('parent_selected_child'));
  const selectedChild = childList.find((child) => child.id === requestedChildId) || childList[0] || null;
  const selectedId = selectedChild?.id || null;

  useEffect(() => {
    if (!selectedChild?.id) return;
    localStorage.setItem('parent_selected_child', selectedChild.id);
    if (requestedChildId !== selectedChild.id) setRequestedChildId(selectedChild.id);
  }, [selectedChild?.id, requestedChildId]);

  const selectChild = (childId) => {
    if (childList.some((child) => child.id === childId)) setRequestedChildId(childId);
  };

  return (
    <ChildCtx.Provider value={{ childList, selectedChild, selectedId, selectChild }}>
      {children}
    </ChildCtx.Provider>
  );
}

export const useChild = () => useContext(ChildCtx);
