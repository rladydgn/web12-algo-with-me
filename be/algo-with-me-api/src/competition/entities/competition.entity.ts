import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CompetitionParticipant } from './competition.participant.entity';
import { CompetitionProblem } from './competition.problem.entity';
import { Submission } from './submission.entity';

import { Dashboard } from '@src/dashboard/entities/dashboard.entity';
import { User } from '@src/user/entities/user.entity';

@Entity()
export class Competition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text')
  detail: string;

  @Column()
  maxParticipants: number;

  @Column()
  startsAt: Date;

  @Column()
  endsAt: Date;

  @OneToMany(() => Submission, (submission) => submission.competition)
  submissions: Submission[];

  @OneToMany(() => CompetitionProblem, (competitionProblem) => competitionProblem.competition)
  competitionProblems: CompetitionProblem[];

  @OneToMany(
    () => CompetitionParticipant,
    (competitionParticipant) => competitionParticipant.competition,
  )
  competitionParticipants: CompetitionParticipant[];

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.competitions, { nullable: false })
  user: User;

  @OneToMany(() => Dashboard, (dashboard) => dashboard.competition)
  dashboards: Dashboard[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
