import { Module } from '@nestjs/common';
import { HelpController } from './help.controller';
import { HelpService } from './help.service';
import { HelpSeedService } from './seed/help-seed.service';

@Module({
  controllers: [HelpController],
  providers: [HelpService, HelpSeedService],
  exports: [HelpService],
})
export class HelpModule {}
