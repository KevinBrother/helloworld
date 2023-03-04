import { Context, LiftState } from './service';

const liftConntext = new Context(Context.operationOpen, LiftState.open);

liftConntext.close();
liftConntext.run();
liftConntext.stop();
liftConntext.open();
liftConntext.run();
liftConntext.stop();
