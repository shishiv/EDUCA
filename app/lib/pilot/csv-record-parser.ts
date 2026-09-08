interface CsvRecordParserState {
  records: string[][]
  record: string[]
  field: string
  quoted: boolean
}

function appendField(state: CsvRecordParserState): void {
  state.record.push(state.field.trim())
  state.field = ''
}

function appendRecord(state: CsvRecordParserState): void {
  appendField(state)
  if (state.record.some(value => value !== '')) state.records.push(state.record)
  state.record = []
}

function consumeQuote(state: CsvRecordParserState, nextCharacter: string | undefined): number {
  if (state.quoted && nextCharacter === '"') {
    state.field += '"'
    return 1
  }
  state.quoted = !state.quoted
  return 0
}

function consumeLineBreak(
  state: CsvRecordParserState,
  character: string,
  nextCharacter: string | undefined
): number {
  appendRecord(state)
  return character === '\r' && nextCharacter === '\n' ? 1 : 0
}

function consumeCharacter(
  state: CsvRecordParserState,
  character: string,
  nextCharacter: string | undefined
): number {
  if (character === '"') return consumeQuote(state, nextCharacter)
  if (state.quoted) {
    state.field += character
    return 0
  }
  if (character === ',') {
    appendField(state)
    return 0
  }
  if (character === '\n' || character === '\r') return consumeLineBreak(state, character, nextCharacter)
  state.field += character
  return 0
}

/** Parses quoted CSV records while leaving schema and row validation to the caller. */
export function parseCsvRecords(csv: string, unclosedQuoteError: string): string[][] {
  const state: CsvRecordParserState = { records: [], record: [], field: '', quoted: false }

  for (let index = 0; index < csv.length; index += 1) {
    index += consumeCharacter(state, csv[index], csv[index + 1])
  }

  if (state.quoted) throw new Error(unclosedQuoteError)
  appendRecord(state)
  return state.records
}
