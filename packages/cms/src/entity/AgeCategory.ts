import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'

import { Article } from './Article'
import { Video } from './Video'

@Entity()
export class AgeCategory {
  @PrimaryColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  minAge: number | null

  @Column({ nullable: true })
  maxAge: number | null

  @Column()
  lang: string

  @OneToMany(() => Article, (article) => article.ageCategory)
  articles?: Article[]

  @OneToMany(() => Video, (video) => video.ageCategory)
  videos?: Video[]

  @Column({ generated: 'increment' })
  sortingKey: number
}
