import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity()
export class AgeCategory {
  @PrimaryColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  minAge: number

  @Column({ nullable: true })
  maxAge: number

  @Column()
  lang: string

  @Column({ generated: 'increment' })
  sortingKey: number
}
