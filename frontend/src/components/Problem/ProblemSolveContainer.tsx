import { css, cva } from '@style/css';

import { useContext, useEffect, useState } from 'react';

import { CompetitionId } from '@/apis/competitions';
import { CompetitionProblem } from '@/apis/problems';
import { Button, HStack, HStackProps, Modal, Space, VStack } from '@/components/Common';
import { SubmissionForm } from '@/hooks/competition';
import { useUserCode } from '@/hooks/editor/useUserCode';
import useAuth from '@/hooks/login/useAuth';
import { SimulationInput, useSimulation } from '@/hooks/simulation';
import { useSubmitSolution } from '@/hooks/submission/useSubmitSolution';
import * as customLocalStorage from '@/utils/localStorage';
import { isNil } from '@/utils/type';

import { SocketContext } from '../Common/Socket/SocketContext';
import Editor from '../Editor/Editor';
import { SimulationExecButton } from '../Simulation/SimulationExecButton';
import { SimulationInputModal } from '../Simulation/SimulationInputModal';
import { SimulationResultList } from '../Simulation/SimulationResultList';
import { SubmissionResult } from '../Submission/SubmissionResult';
import { ScoreResult, ScoreStart, SUBMIT_STATE } from '../Submission/types';
import ProblemViewer from './ProblemViewer';

interface Props extends HStackProps {
  currentProblemIndex: number;
  competitionId: CompetitionId;
  problem: CompetitionProblem;
}

const SIMULATION_TAP = 0;
const SUBMISSION_TAP = 1;

const simulationInputCache: Record<`${CompetitionId}|${number}`, SimulationInput[]> = {};

export function ProblemSolveContainer({
  currentProblemIndex,
  competitionId,
  problem,
  ...props
}: Props) {
  const [currentTab, setCurrentTab] = useState(0);

  const { email } = useAuth();
  const { code, setCode } = useUserCode({
    userId: email,
    problem,
    competitionId,
    currentProblemIndex,
    save: customLocalStorage.save,
  });

  let testcases: SimulationInput[] = [];
  if (isNil(simulationInputCache[`${competitionId}|${currentProblemIndex}`])) {
    testcases = problem.testcases;
  } else {
    testcases = simulationInputCache[`${competitionId}|${currentProblemIndex}`];
  }
  const simulation = useSimulation(testcases);

  const handleChangeCode = (newCode: string) => {
    setCode(newCode);
  };

  const handleSimulate = () => {
    setCurrentTab(SIMULATION_TAP);
    simulation.run(code);
  };

  const handleSimulationCancel = () => {
    simulation.cancel();
  };

  const handleSaveSimulationInputs = (simulationInputs: SimulationInput[]) => {
    simulationInputCache[`${competitionId}|${currentProblemIndex}`] = simulationInputs;
    simulation.changeInputs(simulationInputs);
  };

  const modal = useContext(Modal.Context);

  function handleOpenModal() {
    modal.open();
  }

  const { socket, isConnected } = useContext(SocketContext);
  const submission = useSubmitSolution(socket);
  function handleSubmitSolution() {
    if (isNil(problem.id)) {
      console.error('존재하지 않는 문제입니다.');
      return;
    }

    const form = {
      problemId: problem.id,
      code,
      competitionId,
    } satisfies SubmissionForm;

    if (isNil(socket) || !isConnected) {
      alert('연결에 실패했습니다.');
      return;
    }

    setCurrentTab(SUBMISSION_TAP);
    submission.submit(form);
  }

  const handleScoreResult = (
    data: ScoreResult & {
      testcaseId: number;
    },
  ) => {
    const { problemId, result, stdOut, testcaseId } = data;
    const newResult = {
      testcaseId,
      submitState: SUBMIT_STATE.submitted,
      score: {
        problemId,
        result,
        stdOut,
      } satisfies ScoreResult,
    };

    submission.changeDoneScoreResult(newResult);
  };

  const handleScoreStart = (rawData: ScoreStart) => {
    const { testcaseNum } = rawData;
    submission.toEvaluatingState(testcaseNum);
  };

  useEffect(() => {
    if (isNil(socket)) return;

    if (!socket.hasListeners('scoreStart')) {
      socket.on('scoreStart', handleScoreStart);
    }
    if (!socket.hasListeners('scoreResult')) {
      socket.on('scoreResult', handleScoreResult);
    }
  }, [socket]);

  useEffect(() => {
    submission.emptyResults();
  }, [currentProblemIndex]);

  return (
    <HStack className={css({ height: '100%' })} {...props}>
      <VStack className={problemSolveContainerStyle}>
        <ProblemViewer className={problemStyle} content={problem.content}></ProblemViewer>
        <HStack className={solutionStyle}>
          <Editor height="50%" code={code} onChangeCode={handleChangeCode}></Editor>
          <section className={resultContainerStyle}>
            <div
              className={css({
                borderRadius: '0.5rem',
                bg: 'surface',
                maxHeight: '100%',
                overflow: 'auto',
              })}
            >
              <SimulationResultList
                className={tabStyle({ visible: currentTab === SIMULATION_TAP })}
                resultList={simulation.results}
              ></SimulationResultList>
              <SubmissionResult
                className={tabStyle({ visible: currentTab === SUBMISSION_TAP })}
                submitResults={submission.scoreResults}
              ></SubmissionResult>
            </div>
          </section>
        </HStack>
      </VStack>
      <VStack as="footer" className={footerStyle}>
        <Button onClick={handleOpenModal}>테스트 케이스 추가하기</Button>
        <Space></Space>
        <SimulationExecButton
          isRunning={simulation.isRunning}
          onExec={handleSimulate}
          onCancel={handleSimulationCancel}
        />
        <Button theme="brand" className={submissionButtonStyle} onClick={handleSubmitSolution}>
          제출하기
        </Button>
      </VStack>
      <SimulationInputModal
        className={simulationModalStyle}
        simulationInputs={simulation.inputs}
        onSave={handleSaveSimulationInputs}
      ></SimulationInputModal>
    </HStack>
  );
}

const problemSolveContainerStyle = css({
  height: 'calc(100% - 4rem)',
  width: 'full',
});

const problemStyle = css({
  width: '1/2',
  height: 'full',
});

const solutionStyle = css({
  width: '1/2',
  height: 'full',
  alignItems: 'stretch',
  overflow: 'auto',
});

const footerStyle = css({
  height: '4rem',
  width: 'full',
  paddingX: '1rem',
  gap: '0.5rem',
  borderTop: '1px solid',
  borderColor: 'border',
  placeItems: 'center',
});

const resultContainerStyle = css({
  height: '50%',
  overflow: 'auto',
  padding: '1rem',
});

const tabStyle = cva({
  variants: {
    visible: {
      true: {
        display: 'block',
      },
      false: {
        display: 'none',
      },
    },
  },
});

const submissionButtonStyle = css({
  paddingX: '2rem',
});

const simulationModalStyle = css({
  width: '1000px',
});
