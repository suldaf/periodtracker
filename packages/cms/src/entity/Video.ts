import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { AgeCategory } from './AgeCategory'

@Entity()
export class Video {
  @PrimaryColumn('uuid')
  id: string

  @Column()
  title: string

  @Column({ nullable: true })
  youtubeId: string | null

  @Column({ nullable: true })
  assetName: string | null

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date_created: string

  @Column()
  live: boolean

  @Column()
  lang: string

  @Column({ nullable: true })
  ageCategoryId: string | null

  @ManyToOne(() => AgeCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ageCategoryId' })
  ageCategory?: AgeCategory

  @Column({ generated: 'increment' })
  sortingKey: number
}
