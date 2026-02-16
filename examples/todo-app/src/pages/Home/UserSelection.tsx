import { useSuspense } from '@data-client/react';
import { styled } from '@linaria/react';
import { UserResource } from 'resources/UserResource';

export default function UserSelection({ userId, setUserId }: Props) {
  const users = useSuspense(UserResource.getList);
  return (
    <UsersRow>
      {users.map((user) => (
        <UserPill
          key={user.pk()}
          onClick={(e) => {
            e.preventDefault();
            setUserId(user.id);
          }}
          active={user.id === userId}
          href="#"
          title={user.name}
        >
          <Avatar
            src={user.profileImage}
            alt={user.name}
            active={user.id === userId}
          />
          <UserName>{user.name}</UserName>
        </UserPill>
      ))}
    </UsersRow>
  );
}

interface Props {
  userId: number;
  setUserId: (v: number) => void;
}

const UsersRow = styled.div`
  display: flex;
  gap: 6px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 2px 0;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const UserPill = styled.a<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 5px;
  background: ${(props) =>
    props.active ? 'var(--bg-elevated)' : 'transparent'};
  border: 1px solid
    ${(props) => (props.active ? 'var(--accent)' : 'transparent')};
  border-radius: 24px;
  color: ${(props) =>
    props.active ? 'var(--accent-bright)' : 'var(--text-secondary)'};
  text-decoration: none;
  font-size: 13px;
  font-weight: ${(props) => (props.active ? '600' : '400')};
  white-space: nowrap;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }
`;

const Avatar = styled.img<{ active: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid
    ${(props) => (props.active ? 'var(--accent)' : 'var(--border-light)')};
  transition: border-color 0.2s;
`;

const UserName = styled.span`
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    display: none;
  }
`;
