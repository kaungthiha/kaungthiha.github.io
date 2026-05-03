import { FestivalSet } from '../types/festival';

// Base dates for each festival day
const FRIDAY_BASE = new Date('2026-05-15T00:00:00');
const SATURDAY_BASE = new Date('2026-05-16T00:00:00');
const SUNDAY_BASE = new Date('2026-05-17T00:00:00');

function getBaseDate(day: string): Date {
  switch (day) {
    case 'Friday': return FRIDAY_BASE;
    case 'Saturday': return SATURDAY_BASE;
    case 'Sunday': return SUNDAY_BASE;
    default: return FRIDAY_BASE;
  }
}

/**
 * Parse an EDC time string like "7:00 PM", "12:32 AM", "4:14-5:30 AM"
 * AM times (12:00 AM - 5:30 AM) belong to base date + 1 day (post-midnight)
 * The timeStr may be a range like "4:14-5:30 AM" — we always use the FIRST time only
 * (caller passes individual start/end strings)
 */
export function parseEDCTime(day: string, timeStr: string): Date {
  const base = getBaseDate(day);
  // Strip range notation if present — take only the relevant part
  // e.g. "4:14-5:30 AM" should be parsed as "4:14 AM"
  // But callers pass individual strings already; handle just in case
  let cleaned = timeStr.trim();

  // If it looks like "H:MM-H:MM AM/PM", extract just the first time + period
  const rangeMatch = cleaned.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*(AM|PM)$/i);
  if (rangeMatch) {
    cleaned = `${rangeMatch[1]} ${rangeMatch[3]}`;
  }

  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    console.warn(`Could not parse time: "${timeStr}"`);
    return new Date(base);
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  // Convert 12-hour to 24-hour
  if (period === 'AM') {
    if (hours === 12) hours = 0; // 12:xx AM => 0:xx
  } else {
    if (hours !== 12) hours += 12; // PM: add 12 except for 12 PM
  }

  const result = new Date(base);

  // Post-midnight hours (0:00 - 5:30 AM) roll over to next calendar day
  if (period === 'AM' && hours < 12) {
    // AM time: next day
    result.setDate(result.getDate() + 1);
  }

  result.setHours(hours, minutes, 0, 0);
  return result;
}

let idCounter = 0;
function makeId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function set(
  day: string,
  stage: string,
  artist: string,
  startStr: string,
  endStr: string,
  genre?: string,
  notes?: string
): FestivalSet {
  const stageKey = stage.toLowerCase().replace(/\s+/g, '-').slice(0, 3);
  const dayKey = day.slice(0, 3).toLowerCase();
  return {
    id: makeId(`${dayKey}-${stageKey}`),
    artist,
    stage,
    startTime: parseEDCTime(day, startStr),
    endTime: parseEDCTime(day, endStr),
    genre,
    day,
    notes,
  };
}

export const EDC_2026_SETS: FestivalSet[] = [
  // ─── FRIDAY ───────────────────────────────────────────────────────────────

  // Kinetic Field — Friday
  set('Friday', 'Kinetic Field', 'Laidback Luke B2B Chuckie', '7:00 PM', '8:00 PM', 'House'),
  set('Friday', 'Kinetic Field', 'Korolova', '8:00 PM', '9:00 PM', 'Melodic House'),
  set('Friday', 'Kinetic Field', 'Argy', '9:00 PM', '10:07 PM', 'Melodic Techno'),
  set('Friday', 'Kinetic Field', 'Chris Lorenzo', '10:07 PM', '11:19 PM', 'House'),
  set('Friday', 'Kinetic Field', 'Sofi Tukker', '11:19 PM', '12:32 AM', 'House'),
  set('Friday', 'Kinetic Field', 'The Chainsmokers', '12:32 AM', '1:47 AM', 'Pop/EDM'),
  set('Friday', 'Kinetic Field', 'Fisher', '1:47 AM', '3:01 AM', 'House'),
  set('Friday', 'Kinetic Field', 'Porter Robinson (DJ Set)', '3:01 AM', '4:14 AM', 'Electronic'),
  set('Friday', 'Kinetic Field', 'Charlotte de Witte', '4:14 AM', '5:30 AM', 'Techno'),

  // Circuit Grounds — Friday
  set('Friday', 'Circuit Grounds', '1991', '7:00 PM', '8:00 PM', 'Drum & Bass'),
  set('Friday', 'Circuit Grounds', 'Bou', '8:00 PM', '9:00 PM', 'Drum & Bass'),
  set('Friday', 'Circuit Grounds', 'Nico Moreno', '9:00 PM', '10:00 PM', 'Techno'),
  set('Friday', 'Circuit Grounds', 'I Hate Models', '10:00 PM', '11:15 PM', 'Techno'),
  set('Friday', 'Circuit Grounds', 'Levity', '11:15 PM', '12:25 AM', 'Drum & Bass'),
  set('Friday', 'Circuit Grounds', 'Wooli', '12:25 AM', '1:35 AM', 'Dubstep'),
  set('Friday', 'Circuit Grounds', 'The Outlaw', '1:35 AM', '2:35 AM', 'Bass'),
  set('Friday', 'Circuit Grounds', 'Holy Priest', '2:35 AM', '3:30 AM', 'Bass'),
  set('Friday', 'Circuit Grounds', 'Ray Volpe', '3:30 AM', '4:30 AM', 'Dubstep'),
  set('Friday', 'Circuit Grounds', 'Level Up', '4:30 AM', '5:30 AM', 'Bass'),

  // Cosmic Meadow — Friday
  set('Friday', 'Cosmic Meadow', 'Max Dean B2B Luke Dean', '5:00 PM', '7:00 PM', 'Melodic House'),
  set('Friday', 'Cosmic Meadow', 'Jackie Hollander', '7:00 PM', '7:55 PM', 'House'),
  set('Friday', 'Cosmic Meadow', 'Roddy Lima', '7:55 PM', '8:55 PM', 'Tech House'),
  set('Friday', 'Cosmic Meadow', 'Westend', '8:55 PM', '9:55 PM', 'Tech House'),
  set('Friday', 'Cosmic Meadow', 'Walker & Royce B2B VNSSA', '9:55 PM', '11:10 PM', 'Tech House'),
  set('Friday', 'Cosmic Meadow', 'Underworld', '11:10 PM', '12:25 AM', 'Electronic'),
  set('Friday', 'Cosmic Meadow', 'MEDUZA', '12:25 AM', '1:47 AM', 'Melodic House'),
  set('Friday', 'Cosmic Meadow', 'Notion', '1:47 AM', '2:47 AM', 'House'),
  set('Friday', 'Cosmic Meadow', 'MPH', '2:47 AM', '4:02 AM', 'House'),
  set('Friday', 'Cosmic Meadow', 'San Pacho', '4:02 AM', '5:30 AM', 'Tech House'),

  // Neon Garden — Friday
  set('Friday', 'Neon Garden', 'Anastazja', '7:00 PM', '8:30 PM', 'Techno'),
  set('Friday', 'Neon Garden', 'MASTIZA', '8:30 PM', '10:00 PM', 'Techno'),
  set('Friday', 'Neon Garden', 'DJ Tennis B2B Chloe Caillet', '10:00 PM', '11:30 PM', 'Tech House'),
  set('Friday', 'Neon Garden', 'Peggy Gou', '11:30 PM', '1:00 AM', 'House'),
  set('Friday', 'Neon Garden', 'Adriatique', '1:00 AM', '2:30 AM', 'Melodic House'),
  set('Friday', 'Neon Garden', 'Joseph Capriati', '2:30 AM', '4:00 AM', 'Techno'),
  set('Friday', 'Neon Garden', 'Eli Brown', '4:00 AM', '5:30 AM', 'Tech House'),

  // Basspod — Friday
  set('Friday', 'Basspod', 'RIOT', '7:00 PM', '7:50 PM', 'Dubstep'),
  set('Friday', 'Basspod', 'HEYZ', '7:50 PM', '8:40 PM', 'Bass'),
  set('Friday', 'Basspod', 'MUZZ', '8:40 PM', '9:30 PM', 'Bass'),
  set('Friday', 'Basspod', 'GorillaT', '9:30 PM', '10:30 PM', 'Bass'),
  set('Friday', 'Basspod', 'Ghengar', '10:30 PM', '11:30 PM', 'Bass'),
  set('Friday', 'Basspod', 'Deathpact', '11:30 PM', '12:30 AM', 'Dubstep'),
  set('Friday', 'Basspod', 'ATLiens', '12:30 AM', '1:30 AM', 'Dubstep'),
  set('Friday', 'Basspod', 'Kai Wachi', '1:30 AM', '2:30 AM', 'Dubstep'),
  set('Friday', 'Basspod', 'Adventure Club (Throwback Set)', '2:30 AM', '3:30 AM', 'Dubstep'),
  set('Friday', 'Basspod', 'Culture Shock', '3:30 AM', '4:30 AM', 'Drum & Bass'),
  set('Friday', 'Basspod', 'Cyclops', '4:30 AM', '5:30 AM', 'Bass'),

  // Wasteland — Friday
  set('Friday', 'Wasteland', 'DAMINA', '7:00 PM', '8:30 PM', 'Hardstyle'),
  set('Friday', 'Wasteland', 'Serafina', '8:30 PM', '9:30 PM', 'Hardstyle'),
  set('Friday', 'Wasteland', 'Johannes Schuster', '9:30 PM', '10:30 PM', 'Hardstyle'),
  set('Friday', 'Wasteland', 'Adrian Mills', '10:30 PM', '11:30 PM', 'Hardstyle'),
  set('Friday', 'Wasteland', 'Cloudy', '11:30 PM', '12:30 AM', 'Hardstyle'),
  set('Friday', 'Wasteland', 'KUKO', '12:30 AM', '1:30 AM', 'Hardstyle'),
  set('Friday', 'Wasteland', 'GRAVEDGR', '1:30 AM', '2:30 AM', 'Hardstyle'),
  set('Friday', 'Wasteland', 'Rebekah', '2:30 AM', '3:30 AM', 'Techno'),
  set('Friday', 'Wasteland', 'DYEN', '3:30 AM', '4:30 AM', 'Hardstyle'),
  set('Friday', 'Wasteland', 'Stan Christ', '4:30 AM', '5:30 AM', 'Hardstyle'),

  // Quantum Valley — Friday
  set('Friday', 'Quantum Valley', 'Sarah de Warren', '7:00 PM', '8:00 PM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Matty Ralph', '8:00 PM', '9:00 PM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Cold Blue', '9:00 PM', '10:00 PM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Pegassi', '10:00 PM', '11:00 PM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Darude', '11:00 PM', '12:00 AM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Cosmic Gate', '12:00 AM', '1:00 AM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Gareth Emery', '1:00 AM', '2:00 AM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Ilan Bluestone', '2:00 AM', '3:00 AM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Paul van Dyk', '3:00 AM', '4:00 AM', 'Trance'),
  set('Friday', 'Quantum Valley', 'Darren Porter', '4:00 AM', '5:30 AM', 'Trance'),

  // Stereo Bloom — Friday
  set('Friday', 'Stereo Bloom', 'Abana B2B Juliet Mendoza', '7:00 PM', '8:00 PM', 'House'),
  set('Friday', 'Stereo Bloom', 'SLAMM', '8:00 PM', '9:00 PM', 'House'),
  set('Friday', 'Stereo Bloom', 'Luuk van Dijk', '9:00 PM', '10:15 PM', 'Melodic House'),
  set('Friday', 'Stereo Bloom', 'Omar+', '10:15 PM', '11:30 PM', 'House'),
  set('Friday', 'Stereo Bloom', 'Luke Dean', '11:30 PM', '12:45 AM', 'Melodic House'),
  set('Friday', 'Stereo Bloom', 'Josh Baker', '12:45 AM', '2:00 AM', 'House'),
  set('Friday', 'Stereo Bloom', 'Max Dean', '2:00 AM', '3:15 AM', 'Melodic House'),
  set('Friday', 'Stereo Bloom', 'Obskur', '3:15 AM', '4:30 AM', 'Melodic Techno'),
  set('Friday', 'Stereo Bloom', 'Toman', '4:30 AM', '5:30 AM', 'Melodic House'),

  // Bionic Jungle — Friday
  set('Friday', 'Bionic Jungle', 'Heidi Lawden B2B Masha Mar', '5:00 PM', '7:00 PM', 'Techno'),
  set('Friday', 'Bionic Jungle', 'Stacy Christine', '7:00 PM', '8:00 PM', 'Techno'),
  set('Friday', 'Bionic Jungle', 'The Carry Nation', '8:00 PM', '9:30 PM', 'Techno'),
  set('Friday', 'Bionic Jungle', 'Massimiliano Pagliara', '9:30 PM', '11:00 PM', 'Disco/Electronic'),
  set('Friday', 'Bionic Jungle', 'PARAMIDA', '11:00 PM', '12:30 AM', 'Techno'),
  set('Friday', 'Bionic Jungle', 'salute B2B Chloe Caillet', '12:30 AM', '2:30 AM', 'Techno'),
  set('Friday', 'Bionic Jungle', 'Robert Hood', '2:30 AM', '4:00 AM', 'Detroit Techno'),
  set('Friday', 'Bionic Jungle', 'Avalon Emerson', '4:00 AM', '5:30 AM', 'Techno'),

  // ─── SATURDAY ─────────────────────────────────────────────────────────────

  // Kinetic Field — Saturday
  set('Saturday', 'Kinetic Field', 'AR/CO', '7:00 PM', '8:00 PM', 'Electronic'),
  set('Saturday', 'Kinetic Field', 'HAYLA', '8:00 PM', '9:00 PM', 'Electronic'),
  set('Saturday', 'Kinetic Field', 'Sub Focus', '9:00 PM', '10:07 PM', 'Drum & Bass'),
  set('Saturday', 'Kinetic Field', 'Steve Aoki', '10:07 PM', '11:19 PM', 'Electro House'),
  set('Saturday', 'Kinetic Field', 'Hardwell', '11:19 PM', '12:32 AM', 'Big Room'),
  set('Saturday', 'Kinetic Field', 'John Summit', '12:32 AM', '1:47 AM', 'Tech House'),
  set('Saturday', 'Kinetic Field', 'Subtronics', '1:47 AM', '3:01 AM', 'Riddim Dubstep'),
  set('Saturday', 'Kinetic Field', 'Kaskade', '3:01 AM', '4:14 AM', 'Progressive House'),
  set('Saturday', 'Kinetic Field', 'Above & Beyond (Sunrise Set)', '4:14 AM', '5:30 AM', 'Trance'),

  // Circuit Grounds — Saturday
  set('Saturday', 'Circuit Grounds', 'DJ Mandy', '7:00 PM', '8:00 PM', 'Techno'),
  set('Saturday', 'Circuit Grounds', 'RAZ', '8:00 PM', '9:15 PM', 'Techno'),
  set('Saturday', 'Circuit Grounds', 'KETTAMA', '9:15 PM', '10:45 PM', 'Tech House'),
  set('Saturday', 'Circuit Grounds', 'Sammy Virji', '10:45 PM', '12:15 AM', 'Breaks/House'),
  set('Saturday', 'Circuit Grounds', 'Tiesto', '12:15 AM', '1:45 AM', 'Progressive House'),
  set('Saturday', 'Circuit Grounds', 'Peggy Gou B2B KI/KI', '1:45 AM', '3:15 AM', 'House'),
  set('Saturday', 'Circuit Grounds', 'Boys Noize', '3:15 AM', '4:30 AM', 'Electro/Techno'),
  set('Saturday', 'Circuit Grounds', 'Lilly Palmer', '4:30 AM', '5:30 AM', 'Techno'),

  // Cosmic Meadow — Saturday
  set('Saturday', 'Cosmic Meadow', 'Frost Children', '7:00 PM', '8:15 PM', 'Electronic Pop'),
  set('Saturday', 'Cosmic Meadow', 'Hannah Laing', '8:15 PM', '9:25 PM', 'Drum & Bass'),
  set('Saturday', 'Cosmic Meadow', 'Snow Strippers', '9:25 PM', '10:15 PM', 'Electronic'),
  set('Saturday', 'Cosmic Meadow', 'VTSS (In The Round)', '10:15 PM', '11:35 PM', 'Techno'),
  set('Saturday', 'Cosmic Meadow', 'The Prodigy', '11:35 PM', '12:40 AM', 'Big Beat/Rave'),
  set('Saturday', 'Cosmic Meadow', 'BUNT. (In The Round)', '12:40 AM', '2:10 AM', 'Melodic House'),
  set('Saturday', 'Cosmic Meadow', 'Interplanetary Criminal', '2:10 AM', '3:30 AM', 'Tech House'),
  set('Saturday', 'Cosmic Meadow', 'MALUGI', '3:30 AM', '4:30 AM', 'House'),
  set('Saturday', 'Cosmic Meadow', 'DJ Gigola B2B MCR-T', '4:30 AM', '5:30 AM', 'House'),

  // Neon Garden — Saturday
  set('Saturday', 'Neon Garden', 'mink', '7:00 PM', '8:30 PM', 'Techno'),
  set('Saturday', 'Neon Garden', 'Silvie Loto', '8:30 PM', '10:00 PM', 'Techno'),
  set('Saturday', 'Neon Garden', 'Ahmed Spins', '10:00 PM', '11:30 PM', 'Afro House'),
  set('Saturday', 'Neon Garden', 'Luciano', '11:30 PM', '1:30 AM', 'Techno/House'),
  set('Saturday', 'Neon Garden', 'Prospa', '1:30 AM', '3:30 AM', 'Tech House'),
  set('Saturday', 'Neon Garden', 'Josh Baker B2B KETTAMA B2B Prospa', '3:30 AM', '5:30 AM', 'Tech House'),

  // Basspod — Saturday
  set('Saturday', 'Basspod', 'Fallen with MC Dino', '7:00 PM', '7:50 PM', 'Drum & Bass'),
  set('Saturday', 'Basspod', 'AVELLO B2B Dennett', '7:50 PM', '8:40 PM', 'Bass'),
  set('Saturday', 'Basspod', 'Viperactive', '8:40 PM', '9:30 PM', 'Drum & Bass'),
  set('Saturday', 'Basspod', 'Hybrid Minds', '9:30 PM', '10:30 PM', 'Liquid DnB'),
  set('Saturday', 'Basspod', 'YDG', '10:30 PM', '11:30 PM', 'Bass'),
  set('Saturday', 'Basspod', 'Delta Heavy', '11:30 PM', '12:30 AM', 'Drum & Bass'),
  set('Saturday', 'Basspod', 'Getter', '12:30 AM', '1:30 AM', 'Dubstep'),
  set('Saturday', 'Basspod', 'Eptic B2B Space Laces', '1:30 AM', '2:30 AM', 'Dubstep'),
  set('Saturday', 'Basspod', 'Doctor P B2B Flux Pavilion B2B FuntCase', '2:30 AM', '3:30 AM', 'Dubstep'),
  set('Saturday', 'Basspod', 'HOL!', '3:30 AM', '4:30 AM', 'Bass'),
  set('Saturday', 'Basspod', 'Mary Droppinz', '4:30 AM', '5:30 AM', 'Bass'),

  // Wasteland — Saturday
  set('Saturday', 'Wasteland', 'CUTDWN', '7:00 PM', '8:30 PM', 'Hardstyle'),
  set('Saturday', 'Wasteland', 'Dead X', '8:30 PM', '9:30 PM', 'Hardstyle'),
  set('Saturday', 'Wasteland', 'The Saints', '9:30 PM', '10:30 PM', 'Hardstyle'),
  set('Saturday', 'Wasteland', 'Rob Gee B2B Lenny Dee', '10:30 PM', '11:30 PM', 'Hardcore'),
  set('Saturday', 'Wasteland', 'Lady Faith B2B LNY TNZ', '11:30 PM', '12:30 AM', 'Hardstyle'),
  set('Saturday', 'Wasteland', 'Audiofreq B2B Code Black B2B Toneshifterz', '12:30 AM', '1:30 AM', 'Hardstyle'),
  set('Saturday', 'Wasteland', 'Da Tweekaz', '1:30 AM', '2:30 AM', 'Hardstyle'),
  set('Saturday', 'Wasteland', 'Lil Texas', '2:30 AM', '3:30 AM', 'Hardstyle'),
  set('Saturday', 'Wasteland', 'Mish', '3:30 AM', '4:30 AM', 'Hardstyle'),
  set('Saturday', 'Wasteland', 'Alyssa Jolee', '4:30 AM', '5:30 AM', 'Hardstyle'),

  // Quantum Valley — Saturday
  set('Saturday', 'Quantum Valley', 'Maria Healy', '7:00 PM', '8:30 PM', 'Trance'),
  set('Saturday', 'Quantum Valley', 'SUPERSTRINGS', '8:30 PM', '9:30 PM', 'Trance'),
  set('Saturday', 'Quantum Valley', 'Billy Gillies', '9:30 PM', '10:30 PM', 'Trance'),
  set('Saturday', 'Quantum Valley', 'Paul Oakenfold', '10:30 PM', '11:30 PM', 'Trance'),
  set('Saturday', 'Quantum Valley', 'Andrew Rayel', '11:30 PM', '12:30 AM', 'Trance'),
  set('Saturday', 'Quantum Valley', 'Maddix', '12:30 AM', '1:30 AM', 'Trance'),
  set('Saturday', 'Quantum Valley', 'Mathame', '1:30 AM', '2:30 AM', 'Melodic Techno'),
  set('Saturday', 'Quantum Valley', 'Astrix', '2:30 AM', '3:30 AM', 'Psytrance'),
  set('Saturday', 'Quantum Valley', 'T78', '3:30 AM', '4:30 AM', 'Techno'),
  set('Saturday', 'Quantum Valley', 'Thomas Schumacher', '4:30 AM', '5:30 AM', 'Techno'),

  // Stereo Bloom — Saturday
  set('Saturday', 'Stereo Bloom', 'Slugg', '7:00 PM', '8:00 PM', 'House'),
  set('Saturday', 'Stereo Bloom', 'DREYA V', '8:00 PM', '9:00 PM', 'House'),
  set('Saturday', 'Stereo Bloom', 'Discip', '9:00 PM', '10:00 PM', 'House'),
  set('Saturday', 'Stereo Bloom', 'OMNOM', '10:00 PM', '11:15 PM', 'House'),
  set('Saturday', 'Stereo Bloom', 'Noizu', '11:15 PM', '12:30 AM', 'Tech House'),
  set('Saturday', 'Stereo Bloom', 'Wax Motif', '12:30 AM', '1:45 AM', 'House'),
  set('Saturday', 'Stereo Bloom', 'CID', '1:45 AM', '3:00 AM', 'Tech House'),
  set('Saturday', 'Stereo Bloom', 'HNTR', '3:00 AM', '4:15 AM', 'House'),
  set('Saturday', 'Stereo Bloom', 'BOLO (Sunrise Set)', '4:15 AM', '5:30 AM', 'House'),

  // Bionic Jungle — Saturday
  set('Saturday', 'Bionic Jungle', 'Player Dave', '7:00 PM', '8:00 PM', 'Techno'),
  set('Saturday', 'Bionic Jungle', 'Spray', '8:00 PM', '9:00 PM', 'Techno'),
  set('Saturday', 'Bionic Jungle', 'Bashkka B2B Sedef Adasi', '9:00 PM', '10:30 PM', 'Techno'),
  set('Saturday', 'Bionic Jungle', 'HAAi B2B Luke Alessi', '10:30 PM', '12:00 AM', 'Techno'),
  set('Saturday', 'Bionic Jungle', 'MCR-T', '12:00 AM', '1:15 AM', 'Techno'),
  set('Saturday', 'Bionic Jungle', 'Bad Boombox B2B Ollie Lishman', '1:15 AM', '2:30 AM', 'Techno'),
  set('Saturday', 'Bionic Jungle', 'Benwal', '2:30 AM', '3:30 AM', 'Techno'),
  set('Saturday', 'Bionic Jungle', 'BAUGRUPPE90', '3:30 AM', '4:30 AM', 'Techno'),
  set('Saturday', 'Bionic Jungle', 'Club Angel', '4:30 AM', '5:30 AM', 'Techno'),

  // ─── SUNDAY ───────────────────────────────────────────────────────────────

  // Kinetic Field — Sunday
  set('Sunday', 'Kinetic Field', 'Trace', '7:00 PM', '8:00 PM', 'Drum & Bass'),
  set('Sunday', 'Kinetic Field', 'Ship Wrek', '8:00 PM', '9:00 PM', 'Electronic'),
  set('Sunday', 'Kinetic Field', 'Layton Giordani', '9:00 PM', '10:07 PM', 'Techno'),
  set('Sunday', 'Kinetic Field', 'Funk Tribu', '10:07 PM', '11:19 PM', 'Electronic'),
  set('Sunday', 'Kinetic Field', 'GRiZ B2B Wooli', '11:19 PM', '12:32 AM', 'Bass/Funk'),
  set('Sunday', 'Kinetic Field', 'Zedd', '12:32 AM', '1:47 AM', 'Progressive House'),
  set('Sunday', 'Kinetic Field', 'Martin Garrix', '1:47 AM', '3:01 AM', 'Big Room'),
  set('Sunday', 'Kinetic Field', 'Cloonee', '3:01 AM', '4:14 AM', 'Tech House'),
  set('Sunday', 'Kinetic Field', 'Armin van Buuren (Sunrise Set)', '4:14 AM', '5:30 AM', 'Trance'),

  // Circuit Grounds — Sunday
  set('Sunday', 'Circuit Grounds', 'Linska', '7:00 PM', '8:30 PM', 'Techno'),
  set('Sunday', 'Circuit Grounds', 'ANNA', '8:30 PM', '10:00 PM', 'Techno'),
  set('Sunday', 'Circuit Grounds', 'Beltran', '10:00 PM', '11:30 PM', 'Techno'),
  set('Sunday', 'Circuit Grounds', 'Chris Stussy', '11:30 PM', '1:00 AM', 'Tech House'),
  set('Sunday', 'Circuit Grounds', 'Solomun', '1:00 AM', '2:30 AM', 'Melodic Techno'),
  set('Sunday', 'Circuit Grounds', 'Vintage Culture', '2:30 AM', '4:00 AM', 'Tech House'),
  set('Sunday', 'Circuit Grounds', 'Kevin de Vries', '4:00 AM', '5:30 AM', 'Melodic Techno'),

  // Cosmic Meadow — Sunday
  set('Sunday', 'Cosmic Meadow', 'GRAVAGERZ', '7:00 PM', '8:00 PM', 'Bass'),
  set('Sunday', 'Cosmic Meadow', 'Nostalgix', '8:00 PM', '9:00 PM', 'Bass'),
  set('Sunday', 'Cosmic Meadow', 'William Black', '9:00 PM', '10:00 PM', 'Electronic'),
  set('Sunday', 'Cosmic Meadow', 'San Holo (Wholesome Riddim Set)', '10:00 PM', '11:00 PM', 'Electronic'),
  set('Sunday', 'Cosmic Meadow', 'Dabin', '11:00 PM', '12:05 AM', 'Electronic'),
  set('Sunday', 'Cosmic Meadow', 'Alison Wonderland', '12:05 AM', '1:05 AM', 'Bass'),
  set('Sunday', 'Cosmic Meadow', 'Seven Lions', '1:05 AM', '2:20 AM', 'Melodic Dubstep'),
  set('Sunday', 'Cosmic Meadow', 'Restricted', '2:20 AM', '3:20 AM', 'Techno'),
  set('Sunday', 'Cosmic Meadow', 'Black Tiger Sex Machine', '3:20 AM', '4:30 AM', 'Electronic'),
  set('Sunday', 'Cosmic Meadow', 'Nico Moreno B2B Holy Priest', '4:30 AM', '5:30 AM', 'Techno'),

  // Neon Garden — Sunday
  set('Sunday', 'Neon Garden', 'Bad Beat', '7:00 PM', '8:15 PM', 'Techno'),
  set('Sunday', 'Neon Garden', 'Frankie Bones', '8:15 PM', '9:30 PM', 'Techno/Rave'),
  set('Sunday', 'Neon Garden', 'Adiel', '9:30 PM', '10:50 PM', 'Techno'),
  set('Sunday', 'Neon Garden', 'DJ Gigola', '10:50 PM', '12:10 AM', 'Techno'),
  set('Sunday', 'Neon Garden', '999999999', '12:10 AM', '1:30 AM', 'Techno'),
  set('Sunday', 'Neon Garden', 'Indira Paganotto', '1:30 AM', '2:50 AM', 'Techno'),
  set('Sunday', 'Neon Garden', 'KI/KI', '2:50 AM', '4:10 AM', 'Techno'),
  set('Sunday', 'Neon Garden', 'Klangkuenstler', '4:10 AM', '5:30 AM', 'Techno'),

  // Basspod — Sunday
  set('Sunday', 'Basspod', 'Nightstalker with MC Dino', '7:00 PM', '7:50 PM', 'Drum & Bass'),
  set('Sunday', 'Basspod', 'Sippy', '7:50 PM', '8:40 PM', 'Dubstep'),
  set('Sunday', 'Basspod', 'EAZYBAKED', '8:40 PM', '9:30 PM', 'Bass'),
  set('Sunday', 'Basspod', 'INFEKT B2B Samplifire', '9:30 PM', '10:30 PM', 'Dubstep'),
  set('Sunday', 'Basspod', 'A.M.C with MC Phantom', '10:30 PM', '11:30 PM', 'Drum & Bass'),
  set('Sunday', 'Basspod', 'Virtual Riot', '11:30 PM', '12:30 AM', 'Dubstep'),
  set('Sunday', 'Basspod', 'Peekaboo', '12:30 AM', '1:30 AM', 'Dubstep'),
  set('Sunday', 'Basspod', 'AHEE B2B Liquid Stranger', '1:30 AM', '2:30 AM', 'Bass'),
  set('Sunday', 'Basspod', 'Whethan', '2:30 AM', '3:30 AM', 'Electronic'),
  set('Sunday', 'Basspod', 'Boogie T B2B Distinct Motive', '3:30 AM', '4:30 AM', 'Bass'),
  set('Sunday', 'Basspod', 'AON:MODE (Sunrise Set)', '4:30 AM', '5:30 AM', 'Bass'),

  // Wasteland — Sunday
  set('Sunday', 'Wasteland', 'Sihk', '7:00 PM', '8:30 PM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'Clawz', '8:30 PM', '9:30 PM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'The Purge', '9:30 PM', '10:30 PM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'Yosuf', '10:30 PM', '11:30 PM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'DJ Isaac', '11:30 PM', '12:30 AM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'Vieze Asbak', '12:30 AM', '1:30 AM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'Sub Zero Project', '1:30 AM', '2:30 AM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'Pooler', '2:30 AM', '3:30 AM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'Warface', '3:30 AM', '4:30 AM', 'Hardstyle'),
  set('Sunday', 'Wasteland', 'MADGRRL B2B VESSEL', '4:30 AM', '5:30 AM', 'Hardstyle'),

  // Quantum Valley — Sunday
  set('Sunday', 'Quantum Valley', 'Warung', '7:00 PM', '8:00 PM', 'Trance'),
  set('Sunday', 'Quantum Valley', 'Shingo Nakamura', '8:00 PM', '9:00 PM', 'Progressive Trance'),
  set('Sunday', 'Quantum Valley', 'Rebuke', '9:00 PM', '10:00 PM', 'Trance'),
  set('Sunday', 'Quantum Valley', 'Cristoph', '10:00 PM', '11:00 PM', 'Melodic Techno'),
  set('Sunday', 'Quantum Valley', 'Eli & Fur', '11:00 PM', '12:00 AM', 'Melodic House'),
  set('Sunday', 'Quantum Valley', 'Tinlicker (DJ Set)', '12:00 AM', '1:00 AM', 'Melodic House'),
  set('Sunday', 'Quantum Valley', 'Cassian', '1:00 AM', '2:15 AM', 'Melodic House'),
  set('Sunday', 'Quantum Valley', 'Massano', '2:15 AM', '3:30 AM', 'Melodic Techno'),
  set('Sunday', 'Quantum Valley', 'Innellea', '3:30 AM', '4:30 AM', 'Melodic Techno'),
  set('Sunday', 'Quantum Valley', 'KREAM', '4:30 AM', '5:30 AM', 'Melodic House'),

  // Stereo Bloom — Sunday
  set('Sunday', 'Stereo Bloom', 'KLO', '7:00 PM', '8:00 PM', 'House'),
  set('Sunday', 'Stereo Bloom', "Murphy's Law", '8:00 PM', '9:15 PM', 'House'),
  set('Sunday', 'Stereo Bloom', 'Sidney Charles B2B Bushbaby', '9:15 PM', '10:30 PM', 'House'),
  set('Sunday', 'Stereo Bloom', 'Skream', '10:30 PM', '11:45 PM', 'Dubstep/Bass'),
  set('Sunday', 'Stereo Bloom', 'Hamdi', '11:45 PM', '1:00 AM', 'Bass'),
  set('Sunday', 'Stereo Bloom', 'Chris Lorenzo B2B Bullet Tooth', '1:00 AM', '2:15 AM', 'House'),
  set('Sunday', 'Stereo Bloom', 'Silva Bumpa', '2:15 AM', '3:30 AM', 'House'),
  set('Sunday', 'Stereo Bloom', 'Morgan Seatree', '3:30 AM', '4:30 AM', 'House'),
  set('Sunday', 'Stereo Bloom', 'Lu.Re', '4:30 AM', '5:30 AM', 'House'),

  // Bionic Jungle — Sunday
  set('Sunday', 'Bionic Jungle', 'Alves', '7:00 PM', '8:30 PM', 'Techno'),
  set('Sunday', 'Bionic Jungle', 'ISAbella', '8:30 PM', '10:30 PM', 'Techno'),
  set('Sunday', 'Bionic Jungle', 'KinAhau', '10:30 PM', '12:00 AM', 'Techno'),
  set('Sunday', 'Bionic Jungle', 'Tiga', '12:00 AM', '1:30 AM', 'Techno'),
  set('Sunday', 'Bionic Jungle', 'DJ Tennis B2B Red Axes', '1:30 AM', '3:30 AM', 'Techno'),
  set('Sunday', 'Bionic Jungle', 'Beltran B2B Simas', '3:30 AM', '5:30 AM', 'Techno'),
];

export const STAGES = [
  'Kinetic Field',
  'Circuit Grounds',
  'Cosmic Meadow',
  'Neon Garden',
  'Basspod',
  'Wasteland',
  'Quantum Valley',
  'Stereo Bloom',
  'Bionic Jungle',
];

export const DAYS = ['Friday', 'Saturday', 'Sunday'];
