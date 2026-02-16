import { useController } from '@data-client/react';
import { styled } from '@linaria/react';
import { memo } from 'react';
import { TodoResource, Todo } from 'resources/TodoResource';

function TodoListItem({ todo }: { todo: Todo }) {
  const ctrl = useController();

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) =>
    ctrl.fetch(
      TodoResource.partialUpdate,
      { id: todo.id },
      { completed: e.currentTarget.checked },
    );
  const handleDelete = () =>
    ctrl.fetch(TodoResource.delete, {
      id: todo.id,
    });

  return (
    <TodoItem>
      <CheckboxWrapper>
        <HiddenCheckbox
          type="checkbox"
          id={`todo-${todo.id}`}
          checked={todo.completed}
          onChange={handleToggle}
        />
        <StyledCheckbox completed={todo.completed} htmlFor={`todo-${todo.id}`}>
          {todo.completed && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path
                d="M1 5L4.5 8.5L11 1.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </StyledCheckbox>
      </CheckboxWrapper>
      <TodoLabel htmlFor={`todo-${todo.id}`} completed={todo.completed}>
        {todo.title}
      </TodoLabel>
      <DeleteBtn onClick={handleDelete} aria-label="Delete todo">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1L13 13M1 13L13 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </DeleteBtn>
    </TodoItem>
  );
}
export default memo(TodoListItem);

const TodoItem = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 28px;
  gap: 14px;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--bg-elevated);
  }

  &:hover button {
    opacity: 1;
  }

  @media (max-width: 768px) {
    padding: 12px 20px;
  }
`;

const CheckboxWrapper = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const StyledCheckbox = styled.label<{ completed: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid
    ${(props) => (props.completed ? 'var(--accent)' : 'var(--border-light)')};
  background: ${(props) => (props.completed ? 'var(--accent)' : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--bg-deep);

  &:hover {
    border-color: var(--accent);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const TodoLabel = styled.label<{ completed: boolean }>`
  flex: 1;
  cursor: pointer;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.4;
  color: ${(props) =>
    props.completed ? 'var(--text-muted)' : 'var(--text-primary)'};
  text-decoration: ${(props) => (props.completed ? 'line-through' : 'none')};
  transition: color 0.2s;
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  opacity: 0;
  transition: all 0.15s;

  &:hover {
    color: var(--danger);
    background: var(--danger-bg);
  }
`;
