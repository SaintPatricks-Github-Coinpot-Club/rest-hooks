import { AsyncBoundary, useSuspense } from '@data-client/react';
import { styled } from '@linaria/react';
import { UserResource } from 'resources/UserResource';

import NewTodo from './NewTodo';
import TodoList from './TodoList';
import TodoStats from './TodoStats';

export default function Home({ userId }: { userId: number }) {
  return (
    <HomeContainer>
      <TodoCard>
        <CardHeader>
          <AsyncBoundary fallback={<HeaderTitle>Todos</HeaderTitle>}>
            <UserHeader userId={userId} />
          </AsyncBoundary>
        </CardHeader>
        <AsyncBoundary fallback={<Loading>loading…</Loading>}>
          <NewTodo userId={userId} />
          <TodoList userId={userId} />
          <TodoStats userId={userId} />
        </AsyncBoundary>
      </TodoCard>
    </HomeContainer>
  );
}

function UserHeader({ userId }: { userId: number }) {
  const user = useSuspense(UserResource.get, { id: userId });
  return (
    <div>
      <HeaderTitle>{user.name}</HeaderTitle>
      <HeaderSub>@{user.username}</HeaderSub>
    </div>
  );
}

const HomeContainer = styled.main`
  max-width: 620px;
  margin: 32px auto;
  padding: 0 16px;
  animation: fadeSlideIn 0.5s ease-out;

  @media (max-width: 768px) {
    margin: 16px auto;
  }
`;

const TodoCard = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(212, 148, 60, 0.03);
`;

const CardHeader = styled.div`
  padding: 32px 28px 24px;
  border-bottom: 1px solid var(--border);

  @media (max-width: 768px) {
    padding: 24px 20px 20px;
  }

  @media (max-width: 560px) {
    display: none;
  }
`;

const HeaderTitle = styled.h1`
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const HeaderSub = styled.p`
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 300;
  letter-spacing: 0.02em;
`;

const Loading = styled.div`
  padding: 48px 28px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 300;
  letter-spacing: 0.05em;
`;
