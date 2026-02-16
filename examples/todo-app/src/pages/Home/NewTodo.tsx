import { useController, useLoading } from '@data-client/react';
import { styled } from '@linaria/react';
import { memo, useCallback, useRef } from 'react';
import { TodoResource } from 'resources/TodoResource';

function NewTodo({ userId }: { userId?: number }) {
  const ctrl = useController();
  const inputRef = useRef<HTMLInputElement>(null);
  const [handleAdd, isLoading] = useLoading(async () => {
    const value = inputRef.current?.value.trim() || '';
    if (!value) return;
    await ctrl.fetch(
      TodoResource.getList.unshift,
      { userId },
      {
        title: value,
        userId,
        completed: false,
      },
    );
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [ctrl, userId]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <AddTodo>
      <TodoInput
        ref={inputRef}
        onKeyUp={handleKeyPress}
        placeholder="What needs to be done?"
        disabled={isLoading}
      />
      <AddBtn onClick={handleAdd} disabled={isLoading}>
        {isLoading ? '…' : 'Add'}
      </AddBtn>
    </AddTodo>
  );
}
export default memo(NewTodo);

const AddTodo = styled.div`
  display: flex;
  padding: 20px 28px;
  gap: 12px;
  border-bottom: 1px solid var(--border);

  @media (max-width: 768px) {
    padding: 16px 20px;
  }
`;

const TodoInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 400;
  color: var(--text-primary);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &::placeholder {
    color: var(--text-muted);
    font-weight: 300;
  }

  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const AddBtn = styled.button`
  padding: 12px 24px;
  background: var(--accent);
  color: var(--bg-deep);
  border: none;
  border-radius: 10px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;

  &:hover:not(:disabled) {
    background: var(--accent-bright);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
