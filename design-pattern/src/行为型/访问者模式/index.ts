import { Computer, ComputerPartDisplayVisitor } from './Visiter';

const computer = new Computer();

computer.accept(new ComputerPartDisplayVisitor());
