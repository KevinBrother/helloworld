import { Context, EnumLiftState } from './service';

const liftConntext = new Context(Context.operationOpen, EnumLiftState.open);

liftConntext.close();
liftConntext.run();
liftConntext.stop();
liftConntext.open();
liftConntext.run();
liftConntext.stop();
