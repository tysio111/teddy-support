import { ActionsModule } from '../actions/actions.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ActionParametersService } from './action-parameters.service';
import { ActionParametersController } from './action-parameters.controller';
import { RelationalActionParameterPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ActionsModule,

    // do not remove this comment
    RelationalActionParameterPersistenceModule,
  ],
  controllers: [ActionParametersController],
  providers: [ActionParametersService],
  exports: [
    ActionParametersService,
    RelationalActionParameterPersistenceModule,
  ],
})
export class ActionParametersModule {}
