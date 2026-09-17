import { randomUUID } from 'node:crypto'
import { withLocalDatabase } from '../support/local-database'

export async function createTeacherFixture() {
  const turmaId = randomUUID()
  const teacherId = randomUUID()
  const foreignTeacherId = randomUUID()
  await withLocalDatabase(async db => {
    await db.query('BEGIN')
    try {
      await db.query(`INSERT INTO users (id, nome, email, tipo_usuario, escola_id)
        SELECT $1, 'Titular F09', 'titular-f09@synthetic.invalid', 'professor', escola_id
        FROM users WHERE email = 'diretor@test.com'`, [teacherId])
      await db.query(`INSERT INTO users (id, nome, email, tipo_usuario, escola_id)
        SELECT $1, 'Docente estrangeiro F09', 'estrangeiro-f09@synthetic.invalid', 'professor', id
        FROM escolas WHERE codigo = '00000002'`, [foreignTeacherId])
      await db.query(`INSERT INTO turmas (id, nome, serie, turno, ano_letivo, capacidade, escola_id)
        SELECT $1, 'Turma titular F09', '1º Ano', 'matutino', 2026, 20, escola_id
        FROM users WHERE id = $2`, [turmaId, teacherId])
      const foreign = await db.query(`SELECT id FROM users WHERE id = $1
        AND escola_id <> (SELECT escola_id FROM users WHERE id = $2)`, [foreignTeacherId, teacherId])
      if (foreign.rowCount !== 1) throw new Error('F09 foreign teacher must exist in another school')
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  })
  return {
    turmaId, teacherId, foreignTeacherId,
    async read() {
      return withLocalDatabase(async db => (await db.query(
        'SELECT id, professor_id FROM turmas WHERE id = $1', [turmaId],
      )).rows)
    },
    async cleanup() {
      await withLocalDatabase(async db => {
        await db.query('DELETE FROM turmas WHERE id = $1', [turmaId])
        await db.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[teacherId, foreignTeacherId]])
        const remaining = await db.query(`SELECT id FROM turmas WHERE id = $1
          UNION ALL SELECT id FROM users WHERE id = ANY($2::uuid[])`, [turmaId, [teacherId, foreignTeacherId]])
        if (remaining.rowCount !== 0) throw new Error('Teacher F09 fixture cleanup failed')
      })
    },
  }
}
