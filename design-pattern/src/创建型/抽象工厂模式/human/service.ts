import { MaleFactory, FemaleFactory } from './client';

const maleFactory = new MaleFactory();

const femaleFactory = new FemaleFactory();

const maleBlack = maleFactory.createBlackHuman();
maleBlack.getColor(), maleBlack.getSex(), maleBlack.talk();
const maleWhite = maleFactory.createWhiteHuman();
maleWhite.getColor(), maleWhite.getSex(), maleWhite.talk();
const maleYellow = maleFactory.createYellowHuman();
maleYellow.getColor(), maleYellow.getSex(), maleYellow.talk();

const femaleBlack = femaleFactory.createBlackHuman();
femaleBlack.getColor(), femaleBlack.getSex(), femaleBlack.talk();
const femaleWhite = femaleFactory.createWhiteHuman();
femaleWhite.getColor(), femaleWhite.getSex(), femaleWhite.talk();
const femaleYellow = femaleFactory.createYellowHuman();
femaleYellow.getColor(), femaleYellow.getSex(), femaleYellow.talk();
