import { useSuspense } from '@data-client/react';
import { styled } from '@linaria/react';
import { TodoResource } from 'resources/TodoResource';

import TodoListItem from './TodoListItem';

export default function TodoList({ userId }: { userId?: number }) {
  const todos = useSuspense(TodoResource.getList, { userId });

  if (todos.length === 0) {
    return (
      <EmptyState>
        <EmptyCircle />
        <EmptyText>No todos yet</EmptyText>
        <EmptyHint>Add one above to get started</EmptyHint>
      </EmptyState>
    );
  }

  return (
    <TodosContainer>
      {todos.map((todo) => (
        <TodoListItem key={todo.pk()} todo={todo} />
      ))}
    </TodosContainer>
  );
}

const EmptyState = styled.div`
  padding: 64px 28px;
  text-align: center;
  animation: fadeIn 0.4s ease-out;
`;

const EmptyCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px dashed var(--border-light);
  margin: 0 auto 20px;
`;

const EmptyText = styled.div`
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
`;

const EmptyHint = styled.div`
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 300;
`;

const TodosContainer = styled.div`
  max-height: 480px;
  overflow-y: auto;
`;
