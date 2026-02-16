import { useQuery } from '@data-client/react';
import { styled } from '@linaria/react';
import { queryRemainingTodos, queryTotalTodos } from 'resources/TodoResource';

export default function TodoStats({ userId }: { userId?: number }) {
  const remaining = useQuery(queryRemainingTodos, { userId });
  const total = useQuery(queryTotalTodos, { userId });
  const completed = (total ?? 0) - (remaining ?? 0);
  const progress = total ? (completed / total) * 100 : 0;

  return (
    <Footer>
      <ProgressTrack>
        <ProgressFill style={{ width: `${progress}%` }} />
      </ProgressTrack>
      <StatsRow>
        <Stat>
          <StatValue>{remaining ?? 0}</StatValue>
          <StatLabel>remaining</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{completed}</StatValue>
          <StatLabel>done</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{total}</StatValue>
          <StatLabel>total</StatLabel>
        </Stat>
      </StatsRow>
    </Footer>
  );
}

const Footer = styled.div`
  padding: 20px 28px;
  border-top: 1px solid var(--border);

  @media (max-width: 768px) {
    padding: 16px 20px;
  }
`;

const ProgressTrack = styled.div`
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.4s ease;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 24px;
`;

const Stat = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const StatValue = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 400;
  letter-spacing: 0.03em;
`;
