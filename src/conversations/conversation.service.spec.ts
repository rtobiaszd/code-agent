// Existing code...


describe('ConversationsService', () => {
  let service: ConversationsService;
  let repositoryMock: Repository<ConversationEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getRepositoryToken(ConversationEntity),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    repositoryMock = module.get(getRepositoryToken(ConversationEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMessageById method', () => {
    it('should retrieve a message by ID efficiently', async () => {
      const messageId = 'test-message-id';
      const mockMessage: ConversationEntity = { id: messageId, content: 'Test message' };

      jest.spyOn(repositoryMock, 'findOne').mockResolvedValue(mockMessage);

      await service.getMessageById(messageId);

      expect(jest.isMockFunction(repositoryMock.findOne)).toBe(true);
      expect(repositoryMock.findOne).toHaveBeenCalledWith({ where: { id: messageId } });
    });

    it('should handle retrieval failures gracefully', async () => {
      const messageId = 'test-message-id';
      jest.spyOn(repositoryMock, 'findOne').mockResolvedValue(null);

      await expect(service.getMessageById(messageId)).rejects.toThrow(NotFoundError);
    });
  });
});

// End of existing code