import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class OkyUser {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  nameHash: string

  @Column()
  date_of_birth: string

  @Column()
  province: string

  @Column()
  gender: string

  @Column()
  location: string

  @Column()
  country: string

  @Column()
  lang: string

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_created: string

  @Column()
  type: string

  @Column({ nullable: true })
  score_kespro: string

  @Column({ nullable: true })
  score_keswa: string

  @Column({ nullable: true })
  score_who5: string

  @Column({ nullable: true })
  score_imt: string

  @Column({ type: 'timestamp', nullable: true })
  score_kespro_date: string

  @Column({ type: 'timestamp', nullable: true })
  score_keswa_date: string

  @Column({ type: 'timestamp', nullable: true })
  score_who5_date: string

  @Column({ type: 'timestamp', nullable: true })
  score_imt_date: string
}
