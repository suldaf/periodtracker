import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateQuizScoreRequest {
  @IsNotEmpty()
  @IsString()
  public readonly quizId: string

  @IsNotEmpty()
  @IsString()
  public readonly score: string
}
