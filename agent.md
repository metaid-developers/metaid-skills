### 调整以下文件的读写位置操作方式

1. MetaID-Agent-Chat/group-list-history.log 这个group-list-history.log的位置要调整成放到根目录下面，而不应该放到MetaID-Agent-Chat这个skills下，读取的时候也应该从根目录/group-list-history.log进行读取，动态生成的情况下也应该把group-list-history.log放到根目录下，相关受影响的逻辑，受影响的SKILL.md，references，scripts一并修改


2. 如发现MetaID-Agent-Chat/group-list-history.log已经存在，则把MetaID-Agent-Chat/group-list-history.log文件移动或者拷贝到根目录下