// One person can be assessed for more than one position (GDO-PRES & GDO-VP).
export const canonicalParticipantId = p => p.origin_participant_id || p.id;
export const uniquePeopleCount = rows => new Set(rows.map(canonicalParticipantId)).size;
export const vicePresidentCode = presidentCode => presidentCode.replace(/^GDO-PRES/,'GDO-VP');
